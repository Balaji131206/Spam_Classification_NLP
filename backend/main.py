"""FastAPI application exposing prediction, metrics and the built React app.

Routes are grouped under ``/api``. The compiled frontend (``frontend/dist``)
is served from the same process for production, while development runs the
Vite dev server on port 5173 with a proxy to this API.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .data_loader import DatasetError
from .model import (
    MODES,
    ModelError,
    ModelNotTrainedError,
    ensure_trained,
    load_metrics,
    predict,
    train_mode,
    validate_mode,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
LOGGER = logging.getLogger("backend.main")

APP_VERSION = "1.0.0"
ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"

CHAR_LIMITS: dict[str, int] = {"sms": 1000, "email": 10_000}
BATCH_LIMIT = 100

# Runtime availability per mode; filled during startup and after retraining.
MODE_STATUS: dict[str, dict[str, Any]] = {}


class PredictRequest(BaseModel):
    """Body for ``POST /api/predict``."""

    message: str = Field(..., description="Raw SMS or email text to classify.")
    mode: str = Field("sms", description="'sms' or 'email'")


class BatchPredictRequest(BaseModel):
    """Body for ``POST /api/predict-batch``."""

    messages: list[str] = Field(..., description="Up to 100 messages.")
    mode: str = Field("sms", description="'sms' or 'email'")


def _record_status(mode: str, metrics: dict[str, Any] | None, error: str | None = None) -> None:
    """Store the availability snapshot for ``mode``."""
    dataset = (metrics or {}).get("dataset", {})
    accuracy = (metrics or {}).get("metrics", {}).get("accuracy")
    MODE_STATUS[mode] = {
        "mode": mode,
        "label": mode.upper() if mode == "sms" else "Email",
        "available": error is None,
        "trained": metrics is not None and error is None,
        "error": error,
        "dataset_name": dataset.get("dataset_name"),
        "samples": dataset.get("rows_after_cleaning"),
        "accuracy": accuracy,
        "trained_at": (metrics or {}).get("trained_at"),
    }


def initialise_modes() -> None:
    """Load saved artifacts or train missing ones, isolating failures per mode."""
    for mode in MODES:
        try:
            metrics = ensure_trained(mode)
            _record_status(mode, metrics)
            LOGGER.info("%s mode ready (accuracy=%.4f)", mode, metrics["metrics"]["accuracy"])
        except Exception as exc:  # never let one broken mode take the app down
            LOGGER.exception("Mode %s is unavailable: %s", mode, exc)
            _record_status(mode, None, str(exc) or exc.__class__.__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Prepare both modes before serving requests."""
    initialise_modes()
    yield


app = FastAPI(
    title="Spam Classification Using NLP",
    description="TF-IDF + Multinomial Naive Bayes spam classifier for SMS and email.",
    version=APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _require_mode(mode: str) -> str:
    """Validate the mode name, converting model errors into 400 responses."""
    try:
        return validate_mode(mode)
    except ModelError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _require_ready(mode: str) -> None:
    """Raise 503 with the stored reason when a mode is unavailable."""
    status = MODE_STATUS.get(mode)
    if status is None:
        # Lifespan may not have run (e.g. bare TestClient); try lazily.
        try:
            _record_status(mode, ensure_trained(mode))
        except Exception as exc:
            _record_status(mode, None, str(exc) or exc.__class__.__name__)
            raise HTTPException(status_code=503, detail=f"{mode} mode is unavailable: {exc}") from exc
        return

    if not status["available"]:
        raise HTTPException(
            status_code=503,
            detail=f"{mode} mode is unavailable: {status['error']}",
        )


def _validate_message(message: str, mode: str, index: int | None = None) -> str:
    """Enforce non-empty input and the per-mode character limit."""
    prefix = f"Message {index + 1}: " if index is not None else ""
    if not isinstance(message, str) or not message.strip():
        raise HTTPException(status_code=400, detail=f"{prefix}Message must not be empty.")
    limit = CHAR_LIMITS[mode]
    if len(message) > limit:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{prefix}Message is too long: {len(message):,} characters. "
                f"The limit for {mode} mode is {limit:,} characters."
            ),
        )
    return message


@app.get("/api/health", tags=["system"])
async def health() -> dict[str, Any]:
    """Liveness probe that also reports which modes are ready."""
    return {
        "status": "ok",
        "version": APP_VERSION,
        "frontend_built": FRONTEND_DIST.exists(),
        "modes": {
            mode: {
                "available": status["available"],
                "error": status["error"],
                "trained": status["trained"],
            }
            for mode, status in MODE_STATUS.items()
        },
    }


@app.get("/api/modes", tags=["system"])
async def modes() -> dict[str, Any]:
    """List the supported modes, availability and any loading error."""
    entries = [MODE_STATUS[mode] for mode in MODES if mode in MODE_STATUS]
    for mode in MODES:
        if mode not in MODE_STATUS:
            entries.append(
                {
                    "mode": mode,
                    "label": mode.upper() if mode == "sms" else "Email",
                    "available": False,
                    "trained": False,
                    "error": "Mode has not been initialised yet.",
                    "dataset_name": None,
                    "samples": None,
                    "accuracy": None,
                    "trained_at": None,
                }
            )
    default = next((entry["mode"] for entry in entries if entry["available"]), entries[0]["mode"])
    return {"modes": entries, "default": default}


@app.post("/api/predict", tags=["prediction"])
def classify(payload: PredictRequest) -> dict[str, Any]:
    """Classify a single SMS or email."""
    mode = _require_mode(payload.mode)
    message = _validate_message(payload.message, mode)
    _require_ready(mode)

    try:
        return predict(mode, message)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ModelError as exc:
        LOGGER.exception("Prediction failed for %s mode", mode)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/predict-batch", tags=["prediction"])
def classify_batch(payload: BatchPredictRequest) -> dict[str, Any]:
    """Classify up to 100 messages in one request."""
    mode = _require_mode(payload.mode)
    if not payload.messages:
        raise HTTPException(status_code=400, detail="Provide at least one message.")
    if len(payload.messages) > BATCH_LIMIT:
        raise HTTPException(
            status_code=400,
            detail=f"Too many messages: {len(payload.messages)}. The limit is {BATCH_LIMIT}.",
        )
    for index, message in enumerate(payload.messages):
        _validate_message(message, mode, index)
    _require_ready(mode)

    results: list[dict[str, Any]] = []
    for index, message in enumerate(payload.messages):
        try:
            prediction = predict(mode, message)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Message {index + 1}: {exc}") from exc
        except ModelError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        results.append({"index": index + 1, "message": message, **prediction})

    spam_count = sum(1 for result in results if result["label"] == "SPAM")
    return {
        "mode": mode,
        "results": results,
        "summary": {
            "total": len(results),
            "spam": spam_count,
            "ham": len(results) - spam_count,
        },
    }


@app.get("/api/metrics", tags=["analytics"])
def metrics(mode: str = Query("sms", description="'sms' or 'email'")) -> dict[str, Any]:
    """Return the saved evaluation metrics for one mode."""
    mode = _require_mode(mode)
    _require_ready(mode)
    try:
        return load_metrics(mode)
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ModelError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/dataset-stats", tags=["analytics"])
def dataset_stats(mode: str = Query("sms", description="'sms' or 'email'")) -> dict[str, Any]:
    """Return the dataset summary recorded during training."""
    mode = _require_mode(mode)
    _require_ready(mode)
    try:
        payload = load_metrics(mode)
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ModelError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    dataset = dict(payload.get("dataset", {}))
    dataset["mode"] = mode
    dataset["trained_at"] = payload.get("trained_at")
    return dataset


@app.post("/api/retrain", tags=["system"])
def retrain(mode: str = Query("all", description="'sms', 'email' or 'all'")) -> dict[str, Any]:
    """Retrain one mode (or all) and refresh the availability registry."""
    requested = MODES if mode == "all" else (_require_mode(mode),)
    trained: dict[str, Any] = {}

    for current in requested:
        try:
            payload = train_mode(current)
            _record_status(current, payload)
            trained[current] = {
                "trained_at": payload["trained_at"],
                "metrics": payload["metrics"],
                "spam_metrics": payload["spam_metrics"],
                "confusion_matrix": payload["confusion_matrix"],
            }
        except (DatasetError, ModelError) as exc:
            LOGGER.error("Retraining failed for %s: %s", current, exc)
            _record_status(current, None, str(exc))
            raise HTTPException(
                status_code=503,
                detail=f"Retraining failed for {current} mode: {exc}",
            ) from exc

    return {"retrained": list(trained), "results": trained}


@app.get("/", include_in_schema=False)
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str = "") -> Any:
    """Serve the built React app with an SPA fallback to ``index.html``."""
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(status_code=404, detail="Not found")

    if not FRONTEND_DIST.exists():
        if full_path:
            raise HTTPException(
                status_code=404,
                detail="Frontend build not found. Run 'npm run build' inside frontend/.",
            )
        return {
            "service": "Spam Classification Using NLP API",
            "version": APP_VERSION,
            "docs": "/docs",
            "frontend": "not built - run 'npm run build' in frontend/",
        }

    candidate = (FRONTEND_DIST / full_path).resolve()
    dist_root = FRONTEND_DIST.resolve()
    if full_path and candidate.is_file() and dist_root in candidate.parents:
        return FileResponse(candidate)

    index = dist_root / "index.html"
    if index.exists():
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="index.html missing from the frontend build.")


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
