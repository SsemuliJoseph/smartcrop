"""
tests/test_inference.py
=======================
Tests for the model-serving API (inference/app.py). A tiny throw-away model is built inside the
test (no pretrained weights, no internet) so the HTTP contract is verified without a real model.
These tests check behaviour/plumbing, NOT prediction quality.
"""
import importlib
import io
import json
import os
import sys

import numpy as np
import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

NAMES = ["Early Blight", "Healthy", "Late Blight"]


def _jpeg(color=(40, 160, 50), size=(300, 200)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "JPEG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def model_dir(tmp_path_factory):
    import tensorflow as tf

    d = tmp_path_factory.mktemp("model")
    inp = tf.keras.Input((224, 224, 3))
    x = tf.keras.layers.Rescaling(1 / 255.0)(inp)
    x = tf.keras.layers.Conv2D(4, 3, strides=8, activation="relu")(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    out = tf.keras.layers.Dense(len(NAMES), activation="softmax")(x)
    tf.keras.Model(inp, out).save(d / "model.keras")
    (d / "labels.json").write_text(json.dumps({"classes": NAMES, "display_names": NAMES}))
    (d / "metrics.json").write_text(json.dumps({"test_accuracy": 0.5, "test_images": 10}))
    return d


def _client(monkeypatch, model_dir, threshold="0.0", missing=False):
    base = model_dir if not missing else model_dir / "nope"
    monkeypatch.setenv("MODEL_PATH", str(base / "model.keras"))
    monkeypatch.setenv("LABELS_PATH", str(base / "labels.json"))
    monkeypatch.setenv("METRICS_PATH", str(base / "metrics.json"))
    monkeypatch.setenv("CONFIDENCE_THRESHOLD", threshold)
    import inference.app as app_module

    app_module = importlib.reload(app_module)
    return TestClient(app_module.app)


def test_health_reports_model_and_labels(monkeypatch, model_dir):
    r = _client(monkeypatch, model_dir).get("/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok" and j["classes"] == NAMES and j["test_accuracy"] == 0.5


def test_predict_raw_bytes_returns_valid_distribution(monkeypatch, model_dir):
    r = _client(monkeypatch, model_dir).post("/predict", content=_jpeg(), headers={"Content-Type": "application/octet-stream"})
    assert r.status_code == 200
    j = r.json()
    assert j["disease"] in NAMES and 0.0 <= j["confidence"] <= 1.0
    assert sum(j["probabilities"].values()) == pytest.approx(1.0, abs=1e-3)
    assert j["uncertain"] is False


def test_predict_accepts_multipart_file(monkeypatch, model_dir):
    r = _client(monkeypatch, model_dir).post("/predict", files={"file": ("leaf.jpg", _jpeg(), "image/jpeg")})
    assert r.status_code == 200 and r.json()["disease"] in NAMES


def test_low_confidence_is_flagged_uncertain(monkeypatch, model_dir):
    r = _client(monkeypatch, model_dir, threshold="1.01").post("/predict", content=_jpeg())
    assert r.status_code == 200 and r.json()["uncertain"] is True


def test_invalid_image_is_rejected(monkeypatch, model_dir):
    assert _client(monkeypatch, model_dir).post("/predict", content=b"not an image").status_code == 400


def test_empty_body_is_rejected(monkeypatch, model_dir):
    assert _client(monkeypatch, model_dir).post("/predict", content=b"").status_code == 400


def test_oversized_image_is_rejected(monkeypatch, model_dir):
    assert _client(monkeypatch, model_dir).post("/predict", content=b"0" * (9 * 1024 * 1024)).status_code == 413


def test_missing_model_returns_503_not_a_fake_answer(monkeypatch, model_dir):
    c = _client(monkeypatch, model_dir, missing=True)
    assert c.get("/health").json()["status"] == "model_not_loaded"
    assert c.post("/predict", content=_jpeg()).status_code == 503
