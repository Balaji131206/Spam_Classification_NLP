"""End-to-end API tests for both SMS and email modes."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import FRONTEND_DIST, app

SMS_SPAM = "Congratulations! You won a free prize. Claim now!"
SMS_HAM = "Please send me the notes after class."

EMAIL_SPAM = (
    "Subject: Special offer - cheap medication online\n\n"
    "We are pleased to introduce ourselves as one of the leading online pharmaceutical "
    "companies. Buy viagra and cialis at amazing prices, no prescription needed. Click here "
    "for details and get 12 free pills with your order. Money back guaranteed!"
)
EMAIL_HAM = (
    "Subject: Project meeting\n\n"
    "Hi Balaji, can we meet tomorrow at 10 AM to review the NLP assignment? "
    "Please bring the dataset notes. Thanks, Priya"
)


@pytest.fixture(scope="module")
def client():
    """Client with lifespan so models are loaded/trained exactly once."""
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert set(body["modes"]) == {"sms", "email"}


def test_modes_are_available(client):
    response = client.get("/api/modes")
    assert response.status_code == 200
    body = response.json()
    assert body["default"] in {"sms", "email"}
    modes = {entry["mode"]: entry for entry in body["modes"]}
    assert set(modes) == {"sms", "email"}
    for entry in modes.values():
        assert entry["available"] is True
        assert entry["error"] is None
        assert entry["accuracy"] is not None


@pytest.mark.parametrize(
    ("mode", "message", "expected"),
    [
        ("sms", SMS_SPAM, "SPAM"),
        ("sms", SMS_HAM, "HAM"),
        ("email", EMAIL_SPAM, "SPAM"),
        ("email", EMAIL_HAM, "HAM"),
    ],
)
def test_prediction_labels(client, mode, message, expected):
    response = client.post("/api/predict", json={"message": message, "mode": mode})
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == mode
    assert body["label"] == expected
    assert 0.0 <= body["spam_probability"] <= 1.0
    assert 0.0 <= body["ham_probability"] <= 1.0
    assert abs(body["spam_probability"] + body["ham_probability"] - 1.0) < 1e-6
    assert body["cleaned_text"]
    assert isinstance(body["top_contributing_words"], list)


def test_prediction_influencing_words_shape(client):
    response = client.post("/api/predict", json={"message": SMS_SPAM, "mode": "sms"})
    body = response.json()
    words = body["top_contributing_words"]
    assert len(words) > 0
    for entry in words:
        assert set(entry) == {"word", "weight"}
        assert isinstance(entry["weight"], (int, float))


@pytest.mark.parametrize("message", ["", "   ", "\n\t "])
def test_empty_message_rejected(client, message):
    response = client.post("/api/predict", json={"message": message, "mode": "sms"})
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_invalid_mode_rejected(client):
    response = client.post("/api/predict", json={"message": SMS_SPAM, "mode": "telegram"})
    assert response.status_code == 400
    assert "invalid mode" in response.json()["detail"].lower()

    response = client.get("/api/metrics", params={"mode": "telegram"})
    assert response.status_code == 400


def test_sms_over_length_rejected(client):
    response = client.post("/api/predict", json={"message": "a" * 1001, "mode": "sms"})
    assert response.status_code == 400
    assert "too long" in response.json()["detail"].lower()

    response = client.post("/api/predict", json={"message": "a" * 1000, "mode": "sms"})
    assert response.status_code == 200


def test_email_over_length_rejected(client):
    response = client.post("/api/predict", json={"message": "a" * 10_001, "mode": "email"})
    assert response.status_code == 400
    assert "too long" in response.json()["detail"].lower()

    response = client.post("/api/predict", json={"message": "a" * 10_000, "mode": "email"})
    assert response.status_code == 200


@pytest.mark.parametrize("mode", ["sms", "email"])
def test_metrics_payload(client, mode):
    response = client.get("/api/metrics", params={"mode": mode})
    assert response.status_code == 200
    body = response.json()

    assert body["mode"] == mode
    assert 0.0 <= body["metrics"]["accuracy"] <= 1.0
    for key in ("precision", "recall", "f1"):
        assert 0.0 <= body["metrics"][key] <= 1.0
        assert 0.0 <= body["per_class"]["ham"][key] <= 1.0
        assert 0.0 <= body["per_class"]["spam"][key] <= 1.0

    matrix = body["confusion_matrix"]
    assert set(matrix) == {"tn", "fp", "fn", "tp"}
    assert all(isinstance(value, int) for value in matrix.values())
    assert sum(matrix.values()) == body["dataset"]["test_size"]

    dataset = body["dataset"]
    assert dataset["duplicates_removed"] >= 0
    assert dataset["ham_count"] + dataset["spam_count"] == dataset["rows_after_cleaning"]
    assert dataset["train_size"] + dataset["test_size"] == dataset["rows_after_cleaning"]
    assert dataset["detected_columns"]["text_column"]
    assert dataset["detected_columns"]["label_column"]

    assert len(body["top_spam_words"]) == 15
    assert body["classification_report"]


@pytest.mark.parametrize("mode", ["sms", "email"])
def test_dataset_stats(client, mode):
    response = client.get("/api/dataset-stats", params={"mode": mode})
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == mode
    assert body["rows_loaded"] >= body["rows_after_cleaning"]
    assert body["rows_after_cleaning"] > 0
    assert body["average_text_length"] > 0


def test_batch_prediction(client):
    messages = [SMS_SPAM, SMS_HAM, "Free entry in a weekly competition, text WIN to 80086 now!"]
    response = client.post("/api/predict-batch", json={"messages": messages, "mode": "sms"})
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["total"] == 3
    assert body["summary"]["spam"] + body["summary"]["ham"] == 3
    assert [result["index"] for result in body["results"]] == [1, 2, 3]

    response = client.post(
        "/api/predict-batch",
        json={"messages": [EMAIL_SPAM, EMAIL_HAM], "mode": "email"},
    )
    assert response.status_code == 200
    assert response.json()["summary"]["total"] == 2


def test_batch_limits_and_validation(client):
    response = client.post("/api/predict-batch", json={"messages": [], "mode": "sms"})
    assert response.status_code == 400

    response = client.post(
        "/api/predict-batch",
        json={"messages": ["hello"] * 101, "mode": "sms"},
    )
    assert response.status_code == 400
    assert "limit" in response.json()["detail"].lower()

    response = client.post("/api/predict-batch", json={"messages": ["ok", ""], "mode": "sms"})
    assert response.status_code == 400
    assert "message 2" in response.json()["detail"].lower()


@pytest.mark.skipif(not (Path(FRONTEND_DIST) / "index.html").exists(), reason="frontend not built")
def test_frontend_is_served(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

    deep_link = client.get("/performance")
    assert deep_link.status_code == 200
    assert "text/html" in deep_link.headers["content-type"]
