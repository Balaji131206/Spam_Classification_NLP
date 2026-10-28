"""Dataset loading with automatic text/label column detection.

Both datasets are read with a generic loader so that the exact column names of
``data/email.csv`` do not have to be known in advance. The loader:

1. reads the CSV as UTF-8 and falls back to latin-1;
2. drops columns that are completely empty (the classic SMS file ships three);
3. finds the text column (``message``/``text``/``body`` ... else the longest
   string column) and the label column (``label``/``spam``/``v1`` ... else the
   column with exactly two unique values);
4. prepends a separate ``Subject`` column to the body when one exists;
5. normalises labels to ``0 = ham`` and ``1 = spam``, refusing to guess when a
   mapping is ambiguous;
6. drops null rows and removes exact duplicate texts *before* the split.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

LOGGER = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"

MODE_FILES: dict[str, str] = {"sms": "spam.csv", "email": "email.csv"}
MODE_DATASET_NAMES: dict[str, str] = {
    "sms": "SMS Spam Collection",
    "email": "Email Spam Dataset",
}

TEXT_CANDIDATES = ("message", "text", "body", "email", "content", "mail", "v2")
LABEL_CANDIDATES = ("label", "category", "class", "spam", "target", "v1", "label_num")
SUBJECT_CANDIDATES = ("subject",)

# Accepted label spellings. Anything else raises DatasetError instead of guessing.
SPAM_LABELS = {"spam", "1", "1.0", "yes", "true", "junk", "phishing", "spam message", "spammy"}
HAM_LABELS = {
    "ham",
    "0",
    "0.0",
    "no",
    "false",
    "legitimate",
    "legit",
    "normal",
    "not spam",
    "nonspam",
    "non-spam",
    "safe",
    "notspam",
}


class DatasetError(RuntimeError):
    """Raised when a dataset is missing, unreadable or ambiguous."""


@dataclass
class LoadedDataset:
    """Cleaned dataset plus the statistics reported to the UI.

    Attributes:
        mode: ``"sms"`` or ``"email"``.
        frame: Two-column frame with ``text`` and integer ``label`` (0 ham, 1 spam).
        stats: Serialisable summary used by ``/api/dataset-stats``.
        warnings: Non-fatal notes (e.g. duplicate removal) surfaced in logs.
    """

    mode: str
    frame: pd.DataFrame
    stats: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def dataset_path(mode: str) -> Path:
    """Return the CSV path for ``mode``."""
    try:
        filename = MODE_FILES[mode]
    except KeyError as exc:  # pragma: no cover - guarded by the API layer
        raise DatasetError(f"Unknown mode '{mode}'. Use 'sms' or 'email'.") from exc
    return DATA_DIR / filename


def _read_csv(path: Path) -> tuple[pd.DataFrame, str]:
    """Read a CSV trying UTF-8 first, then latin-1."""
    if not path.exists():
        raise DatasetError(f"Dataset file not found: {path.name} (expected at {path}).")

    last_error: Exception | None = None
    for encoding in ("utf-8", "latin-1"):
        try:
            frame = pd.read_csv(path, encoding=encoding)
            LOGGER.info("Loaded %s with %s encoding (%d rows)", path.name, encoding, len(frame))
            return frame, encoding
        except UnicodeDecodeError as exc:
            last_error = exc
            LOGGER.warning("%s could not be decoded as %s, trying next encoding", path.name, encoding)
        except (pd.errors.ParserError, pd.errors.EmptyDataError) as exc:
            raise DatasetError(f"Could not parse {path.name}: {exc}") from exc
        except OSError as exc:
            raise DatasetError(f"Could not read {path.name}: {exc}") from exc

    raise DatasetError(f"Could not decode {path.name} as UTF-8 or latin-1: {last_error}")


def _find_column(frame: pd.DataFrame, candidates: tuple[str, ...]) -> str | None:
    """Case-insensitive lookup of the first matching column name."""
    lookup = {str(column).strip().lower(): column for column in frame.columns}
    for candidate in candidates:
        if candidate in lookup:
            return lookup[candidate]
    return None


def _string_columns(frame: pd.DataFrame) -> list[str]:
    """Return columns that can plausibly hold free text."""
    columns: list[str] = []
    for column in frame.columns:
        series = frame[column]
        if pd.api.types.is_numeric_dtype(series) or pd.api.types.is_bool_dtype(series):
            continue
        non_null = series.dropna().astype(str)
        if non_null.empty:
            continue
        columns.append(column)
    return columns


def _detect_text_column(frame: pd.DataFrame, explicit: str | None) -> str:
    """Find the text column, falling back to the longest string column."""
    if explicit is not None:
        return explicit

    string_columns = _string_columns(frame)
    if string_columns:
        return max(string_columns, key=lambda column: frame[column].dropna().astype(str).str.len().mean())

    raise DatasetError(
        "Could not detect a text column. Expected one of: "
        + ", ".join(TEXT_CANDIDATES)
        + "."
    )


def _detect_label_column(frame: pd.DataFrame, text_column: str) -> str:
    """Find the label column, falling back to a two-valued column."""
    explicit = _find_column(frame, LABEL_CANDIDATES)
    if explicit is not None and explicit != text_column:
        return explicit

    two_valued: list[str] = []
    for column in frame.columns:
        if column == text_column:
            continue
        values = frame[column].dropna()
        if values.empty:
            continue
        if values.nunique() == 2:
            two_valued.append(column)

    if len(two_valued) == 1:
        return two_valued[0]
    if len(two_valued) > 1:
        # Prefer a numeric 0/1 column, which is unambiguous.
        for column in two_valued:
            unique = set(frame[column].dropna().unique())
            if unique <= {0, 1, "0", "1", 0.0, 1.0}:
                return column
        raise DatasetError(
            "Multiple columns could be the label column: "
            + ", ".join(map(str, two_valued))
            + ". Please rename the label column to 'label' or 'spam'."
        )

    raise DatasetError(
        "Could not detect a label column with exactly two classes. Expected one of: "
        + ", ".join(LABEL_CANDIDATES)
        + "."
    )


def _normalise_labels(series: pd.Series, mode: str) -> pd.Series:
    """Map raw labels to 0 (ham) and 1 (spam), refusing ambiguous mappings."""
    if pd.api.types.is_bool_dtype(series):
        return series.astype(int)

    if pd.api.types.is_numeric_dtype(series):
        unique = set(series.dropna().unique().tolist())
        if not unique <= {0, 1, 0.0, 1.0}:
            raise DatasetError(
                f"{mode} dataset uses numeric labels {sorted(unique)}; expected 0/1. "
                "Tell me which value means spam before training."
            )
        return series.astype(int)

    mapping: dict[str, int] = {}
    unmapped: set[str] = set()
    for value in series.dropna().unique():
        key = str(value).strip().lower()
        if key in SPAM_LABELS:
            mapping[str(value)] = 1
        elif key in HAM_LABELS:
            mapping[str(value)] = 0
        else:
            unmapped.add(str(value))

    if unmapped:
        raise DatasetError(
            f"Ambiguous labels in the {mode} dataset: {sorted(unmapped)}. "
            "Expected ham/spam, legitimate/spam or 0/1. Tell me the mapping to use."
        )

    mapped = series.astype(str).map(mapping)
    if mapped.isna().any():
        raise DatasetError(f"Some {mode} labels could not be mapped to ham/spam.")
    return mapped.astype(int)


def load_dataset(mode: str) -> LoadedDataset:
    """Load, detect, clean and de-duplicate one dataset.

    Args:
        mode: ``"sms"`` or ``"email"``.

    Returns:
        A :class:`LoadedDataset` ready for a stratified train/test split.

    Raises:
        DatasetError: If the file is missing, unreadable, ambiguous or unusable.
    """
    path = dataset_path(mode)
    frame, encoding = _read_csv(path)
    warnings: list[str] = []

    rows_loaded = int(len(frame))
    columns_loaded = [str(column) for column in frame.columns]

    # Completely empty columns carry no information (classic SMS file has 3).
    empty_columns = [column for column in frame.columns if frame[column].isna().all()]
    if empty_columns:
        frame = frame.drop(columns=empty_columns)
        LOGGER.info("Dropped empty columns from %s: %s", path.name, empty_columns)

    text_column = _detect_text_column(frame, _find_column(frame, TEXT_CANDIDATES))
    label_column = _detect_label_column(frame, text_column)

    subject = _find_column(frame, SUBJECT_CANDIDATES)
    if subject is not None and subject != text_column:
        body = frame[text_column].fillna("").astype(str)
        subject_text = frame[subject].fillna("").astype(str)
        frame = frame.copy()
        frame[text_column] = (subject_text + " " + body).str.strip()
        LOGGER.info("Prepended '%s' column to the email body", subject)

    if label_column == text_column:  # pragma: no cover - defensive
        raise DatasetError(f"{mode} dataset detected the same column for text and label.")

    data = pd.DataFrame(
        {
            "text": frame[text_column].astype(str),
            "label": _normalise_labels(frame[label_column], mode),
        }
    )
    detected = {
        "text_column": str(text_column),
        "label_column": str(label_column),
        "subject_column": str(subject) if subject is not None else None,
    }

    # Drop null / blank rows before de-duplication.
    data["text"] = data["text"].replace({"nan": ""})
    before_drop = len(data)
    data = data.dropna(subset=["text", "label"])
    data = data[data["text"].str.strip().ne("")]
    nulls_removed = int(before_drop - len(data))

    # Exact duplicate texts must go before the split to avoid leakage.
    duplicates_removed = int(data.duplicated(subset=["text"]).sum())
    data = data.drop_duplicates(subset=["text"]).reset_index(drop=True)

    if data.empty:
        raise DatasetError(f"{mode} dataset has no usable rows after cleaning.")
    if data["label"].nunique() < 2:
        raise DatasetError(f"{mode} dataset needs both ham and spam examples; only one class found.")

    if duplicates_removed:
        warnings.append(f"Removed {duplicates_removed} duplicate texts before splitting.")

    ham_count = int((data["label"] == 0).sum())
    spam_count = int((data["label"] == 1).sum())
    avg_length = float(data["text"].str.len().mean())

    stats: dict[str, Any] = {
        "mode": mode,
        "dataset_name": MODE_DATASET_NAMES.get(mode, path.stem),
        "file": path.name,
        "encoding": encoding,
        "columns_loaded": columns_loaded,
        "detected_columns": detected,
        "rows_loaded": rows_loaded,
        "rows_after_cleaning": int(len(data)),
        "nulls_removed": nulls_removed,
        "duplicates_removed": duplicates_removed,
        "ham_count": ham_count,
        "spam_count": spam_count,
        "spam_ratio": round(spam_count / len(data), 4),
        "average_text_length": round(avg_length, 2),
        "unique_texts": int(data["text"].nunique()),
    }

    LOGGER.info(
        "%s: %d rows -> %d after cleaning (duplicates removed: %d, nulls removed: %d)",
        mode,
        rows_loaded,
        len(data),
        duplicates_removed,
        nulls_removed,
    )

    return LoadedDataset(mode=mode, frame=data, stats=stats, warnings=warnings)
