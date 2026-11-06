"""
inference/app.py
================
Model-serving API for PotatoGuard (FastAPI). Deployable for free as a Hugging Face
Docker Space (see inference/Dockerfile) or anywhere that runs Python.

  GET  /health   -> status, class list and the held-out test metrics of the loaded model
  POST /predict  -> body = raw image bytes (or multipart field "file"); returns the diagnosis

It never invents a prediction: if no trained model is present, /predict returns 503.
"""

import io
import json
import os
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

HERE = Path(__file__).parent
MODEL_PATH = Path(os.environ.get("MODEL_PATH", HERE / "model.keras"))
LABELS_PATH = Path(os.environ.get("LABELS_PATH", HERE / "labels.json"))
METRICS_PATH = Path(os.environ.get("METRICS_PATH", HERE / "metrics.json"))
MAX_BYTES = 8 * 1024 * 1024
THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.75"))
ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",")]

app = FastAPI(title="PotatoGuard inference", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"])

_model = None
_labels = None


def load():
    """Load model + labels once. Leaves _model None if files are missing."""
    global _model, _labels
    if _model is not None:
        return
    if not (MODEL_PATH.exists() and LABELS_PATH.exists()):
        return
    import tensorflow as tf

    _model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    _labels = json.loads(LABELS_PATH.read_text())


@app.on_event("startup")
def _startup():
    load()


@app.get("/health")
def health():
    load()
    metrics = json.loads(METRICS_PATH.read_text()) if METRICS_PATH.exists() else None
    return {
        "status": "ok" if _model is not None else "model_not_loaded",
        "classes": _labels["display_names"] if _labels else None,
        "test_accuracy": metrics["test_accuracy"] if metrics else None,
        "test_images": metrics["test_images"] if metrics else None,
    }


def _decode(raw: bytes) -> np.ndarray:
    if not raw:
        raise HTTPException(400, "Empty request body: send the image bytes")
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "Image too large (max 8 MB)")
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB").resize((224, 224))
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, "Not a valid image file")
    return np.expand_dims(np.asarray(img, dtype=np.float32), 0)  # 0-255; rescaling is inside the model


@app.post("/predict")
async def predict(request: Request):
    load()
    if _model is None:
        raise HTTPException(503, "Model not loaded: train one (model/train.py) and place model.keras + labels.json in inference/")
    ctype = request.headers.get("content-type", "")
    if ctype.startswith("multipart/form-data"):
        form = await request.form()
        up = form.get("file")
        if up is None:
            raise HTTPException(400, 'Multipart upload must use the field name "file"')
        raw = await up.read()
    else:
        raw = await request.body()

    probs = _model.predict(_decode(raw), verbose=0)[0]
    order = np.argsort(probs)[::-1]
    names = _labels["display_names"]
    top = int(order[0])
    confidence = float(probs[top])
    return {
        "disease": names[top],
        "confidence": confidence,
        "uncertain": confidence < THRESHOLD,
        "probabilities": {names[i]: float(probs[i]) for i in order},
    }
