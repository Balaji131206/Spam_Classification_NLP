"""Per-mode training, evaluation, persistence and inference.

Each mode owns its own TF-IDF vectorizer, Multinomial Naive Bayes model and
metrics file, so SMS and email predictions never share vocabulary or
statistics. Every number reported by the API is produced here from a real
train/test run; nothing is hardcoded.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB

from .data_loader import DatasetError, load_dataset
from .preprocess import preprocess_text

LOGGER = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT_DIR / "models"

MODES: tuple[str, ...] = ("sms", "email")
RANDOM_STATE = 42
TEST_SIZE = 0.2
TOP_SPAM_WORDS = 15
TOP_CONTRIBUTING_WORDS = 8
LABEL_NAMES = {0: "ham", 1: "spam"}


class ModelError(RuntimeError):
    """Base error for model loading, training and prediction problems."""


class ModelNotTrainedError(ModelError):
    """Raised when a prediction is requested before a mode is trained."""


_lock = threading.RLock()
_cache: dict[str, tuple[TfidfVectorizer, MultinomialNB]] = {}


def validate_mode(mode: str) -> str:
    """Return ``mode`` when it is supported, otherwise raise ``ModelError``."""
    if mode not in MODES:
        raise ModelError(f"Invalid mode '{mode}'. Use 'sms' or 'email'.")
    return mode


def artifact_paths(mode: str) -> dict[str, Path]:
    """Return the three artifact paths for ``mode``."""
    validate_mode(mode)
    return {
        "vectorizer": MODELS_DIR / f"{mode}_vectorizer.joblib",
        "model": MODELS_DIR / f"{mode}_model.joblib",
        "metrics": MODELS_DIR / f"{mode}_metrics.json",
    }


def artifacts_exist(mode: str) -> bool:
    """True when vectorizer, model and metrics files are all present."""
    return all(path.exists() for path in artifact_paths(mode).values())


def _top_spam_words(vectorizer: TfidfVectorizer, model: MultinomialNB, limit: int = TOP_SPAM_WORDS) -> list[dict[str, Any]]:
    """Rank vocabulary by log-probability difference between spam and ham."""
    log_prob = model.feature_log_prob_
    diff = log_prob[1] - log_prob[0]
    names = np.asarray(vectorizer.get_feature_names_out())
    order = np.argsort(diff)[::-1][:limit]
    return [{"word": str(names[i]), "weight": round(float(diff[i]), 4)} for i in order]


def _evaluate(vectorizer: TfidfVectorizer, model: MultinomialNB, x_test, y_test) -> dict[str, Any]:
    """Compute accuracy, per-class and weighted metrics plus the confusion matrix."""
    predictions = model.predict(x_test)
    accuracy = float(accuracy_score(y_test, predictions))

    precision, recall, f1, support = precision_recall_fscore_support(
        y_test, predictions, labels=[0, 1], zero_division=0
    )
    weighted = precision_recall_fscore_support(y_test, predictions, average="weighted", zero_division=0)
    matrix = confusion_matrix(y_test, predictions, labels=[0, 1])
    tn, fp, fn, tp = (int(value) for value in matrix.ravel())

    return {
        "metrics": {
            "accuracy": round(accuracy, 4),
            "precision": round(float(weighted[0]), 4),
            "recall": round(float(weighted[1]), 4),
            "f1": round(float(weighted[2]), 4),
            "average": "weighted",
        },
        "spam_metrics": {
            "precision": round(float(precision[1]), 4),
            "recall": round(float(recall[1]), 4),
            "f1": round(float(f1[1]), 4),
            "support": int(support[1]),
        },
        "per_class": {
            "ham": {
                "precision": round(float(precision[0]), 4),
                "recall": round(float(recall[0]), 4),
                "f1": round(float(f1[0]), 4),
                "support": int(support[0]),
            },
            "spam": {
                "precision": round(float(precision[1]), 4),
                "recall": round(float(recall[1]), 4),
                "f1": round(float(f1[1]), 4),
                "support": int(support[1]),
            },
        },
        "confusion_matrix": {"tn": tn, "fp": fp, "fn": fn, "tp": tp},
        "classification_report": classification_report(
            y_test, predictions, labels=[0, 1], target_names=["ham", "spam"], digits=4, zero_division=0
        ),
    }


def train_mode(mode: str) -> dict[str, Any]:
    """Train and persist the vectorizer, model and metrics for ``mode``.

    Args:
        mode: ``"sms"`` or ``"email"``.

    Returns:
        The metrics payload that was written to ``models/<mode>_metrics.json``.

    Raises:
        DatasetError: If the dataset cannot be loaded.
        ModelError: If training fails.
    """
    validate_mode(mode)
    LOGGER.info("Training %s model", mode)

    dataset = load_dataset(mode)
    texts = dataset.frame["text"].tolist()
    labels = dataset.frame["label"].tolist()
    cleaned = [preprocess_text(text, mode) for text in texts]

    # preprocess_text keeps the report's regex pipeline; it never returns None.
    if not any(cleaned):
        raise ModelError(f"{mode} dataset has no usable text after preprocessing.")

    x_train, x_test, y_train, y_test = train_test_split(
        cleaned,
        labels,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=labels,
    )

    # Fit on the training split only so the test metrics stay honest.
    vectorizer = TfidfVectorizer(stop_words="english")
    x_train_matrix = vectorizer.fit_transform(x_train)
    x_test_matrix = vectorizer.transform(x_test)

    model = MultinomialNB()
    model.fit(x_train_matrix, y_train)

    evaluation = _evaluate(vectorizer, model, x_test_matrix, y_test)
    trained_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    dataset_stats = dict(dataset.stats)
    dataset_stats.update(
        {
            "train_size": int(len(x_train)),
            "test_size": int(len(x_test)),
            "train_spam": int(sum(y_train)),
            "test_spam": int(sum(y_test)),
        }
    )

    payload: dict[str, Any] = {
        "mode": mode,
        "trained_at": trained_at,
        "model": {"type": "MultinomialNB", "alpha": 1.0},
        "vectorizer": {"type": "TfidfVectorizer", "stop_words": "english"},
        "split": {
            "test_size": TEST_SIZE,
            "random_state": RANDOM_STATE,
            "train_size": int(len(x_train)),
            "test_size_rows": int(len(x_test)),
        },
        "dataset": dataset_stats,
        "top_spam_words": _top_spam_words(vectorizer, model),
        **evaluation,
        "note": "Metrics are computed on the 20% held-out test set.",
    }

    paths = artifact_paths(mode)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    with _lock:
        joblib.dump(vectorizer, paths["vectorizer"])
        joblib.dump(model, paths["model"])
        paths["metrics"].write_text(json.dumps(payload, indent=2), encoding="utf-8")
        _cache[mode] = (vectorizer, model)

    LOGGER.info(
        "%s model trained: accuracy=%.4f precision=%.4f recall=%.4f f1=%.4f",
        mode,
        payload["metrics"]["accuracy"],
        payload["metrics"]["precision"],
        payload["metrics"]["recall"],
        payload["metrics"]["f1"],
    )
    return payload


def load_artifacts(mode: str) -> tuple[TfidfVectorizer, MultinomialNB]:
    """Load the cached or persisted vectorizer/model pair for ``mode``."""
    validate_mode(mode)
    with _lock:
        cached = _cache.get(mode)
        if cached is not None:
            return cached

        paths = artifact_paths(mode)
        if not artifacts_exist(mode):
            raise ModelNotTrainedError(f"The {mode} model is not trained yet. Train it first.")
        try:
            vectorizer: TfidfVectorizer = joblib.load(paths["vectorizer"])
            model: MultinomialNB = joblib.load(paths["model"])
        except Exception as exc:  # corrupt artifact or version mismatch
            raise ModelError(f"Could not load the {mode} model: {exc}") from exc

        _cache[mode] = (vectorizer, model)
        return vectorizer, model


def load_metrics(mode: str) -> dict[str, Any]:
    """Read the saved metrics JSON for ``mode``."""
    validate_mode(mode)
    path = artifact_paths(mode)["metrics"]
    if not path.exists():
        raise ModelNotTrainedError(f"No metrics available for {mode} mode yet.")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ModelError(f"Could not read {mode} metrics: {exc}") from exc


def ensure_trained(mode: str) -> dict[str, Any]:
    """Load artifacts and metrics, training the mode first when needed."""
    validate_mode(mode)
    if not artifacts_exist(mode):
        LOGGER.info("No saved %s artifacts found, training now", mode)
        return train_mode(mode)

    try:
        load_artifacts(mode)
        return load_metrics(mode)
    except (ModelError, OSError, ValueError) as exc:
        LOGGER.warning("Saved %s artifacts unusable (%s), retraining", mode, exc)
        return train_mode(mode)


def predict(mode: str, text: str) -> dict[str, Any]:
    """Classify ``text`` with the trained model for ``mode``.

    Args:
        mode: ``"sms"`` or ``"email"``.
        text: Raw user input.

    Returns:
        Prediction payload with label, probabilities, cleaned text and the
        words that pushed the decision towards spam.

    Raises:
        ModelNotTrainedError: If the mode has no trained artifacts.
        ValueError: If the text has no usable tokens after cleaning.
    """
    vectorizer, model = load_artifacts(mode)
    cleaned = preprocess_text(text, mode)
    if not cleaned:
        raise ValueError("Message contains no usable text after cleaning.")

    matrix = vectorizer.transform([cleaned])
    probabilities = model.predict_proba(matrix)[0]
    classes = list(model.classes_)
    ham_probability = float(probabilities[classes.index(0)]) if 0 in classes else 0.0
    spam_probability = float(probabilities[classes.index(1)]) if 1 in classes else 0.0
    label = "SPAM" if spam_probability >= ham_probability else "HAM"

    vocabulary = vectorizer.vocabulary_
    log_prob = model.feature_log_prob_
    diff = log_prob[1] - log_prob[0]
    seen: set[str] = set()
    contributions: list[dict[str, Any]] = []
    for token in cleaned.split():
        if token in seen or token not in vocabulary:
            continue
        seen.add(token)
        weight = float(diff[vocabulary[token]])
        contributions.append({"word": token, "weight": round(weight, 4)})

    contributions.sort(key=lambda item: item["weight"], reverse=True)

    return {
        "mode": mode,
        "label": label,
        "spam_probability": round(spam_probability, 4),
        "ham_probability": round(ham_probability, 4),
        "cleaned_text": cleaned,
        "top_contributing_words": contributions[:TOP_CONTRIBUTING_WORDS],
    }


__all__ = [
    "MODES",
    "ModelError",
    "ModelNotTrainedError",
    "DatasetError",
    "artifacts_exist",
    "ensure_trained",
    "load_metrics",
    "predict",
    "train_mode",
    "validate_mode",
]
