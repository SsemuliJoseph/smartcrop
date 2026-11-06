"""
inference/app_onnx.py - same API as app.py (GET /health, POST /predict) but runs the ONNX model with
onnxruntime instead of TensorFlow. ~10x smaller image, ~150 MB RAM, so it fits free 512 MB hosts (Render, Koyeb).
"""
import io
import json
import os
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

HERE = Path(__file__).parent
MODEL_PATH = Path(os.environ.get("ONNX_MODEL_PATH", HERE / "model.onnx"))
LABELS_PATH = Path(os.environ.get("LABELS_PATH", HERE / "labels.json"))
MAX_BYTES = 8 * 1024 * 1024
THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.75"))
ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",")]

app = FastAPI(title="PotatoGuard inference (ONNX)", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"])

_session = None
_names = None


def load():
    global _session, _names
    if _session is None and MODEL_PATH.exists() and LABELS_PATH.exists():
        so = ort.SessionOptions()
        so.intra_op_num_threads = 1
        _session = ort.InferenceSession(str(MODEL_PATH), so, providers=["CPUExecutionProvider"])
        _names = json.loads(LABELS_PATH.read_text())["display_names"]


@app.on_event("startup")
def _startup():
    load()


@app.get("/health")
def health():
    load()
    return {"status": "ok" if _session is not None else "model_not_loaded", "classes": _names}


def _decode(raw: bytes) -> np.ndarray:
    if not raw:
        raise HTTPException(400, "Empty request body: send the image bytes")
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "Image too large (max 8 MB)")
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB").resize((224, 224))
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, "Not a valid image file")
    return np.expand_dims(np.asarray(img, dtype=np.float32), 0)


@app.post("/predict")
async def predict(request: Request):
    load()
    if _session is None:
        raise HTTPException(503, "Model not loaded")
    if request.headers.get("content-type", "").startswith("multipart/form-data"):
        form = await request.form()
        up = form.get("file")
        if up is None:
            raise HTTPException(400, 'Multipart upload must use the field name "file"')
        raw = await up.read()
    else:
        raw = await request.body()
    probs = _session.run(None, {_session.get_inputs()[0].name: _decode(raw)})[0][0]
    order = np.argsort(probs)[::-1]
    top = int(order[0])
    conf = float(probs[top])
    return {
        "disease": _names[top],
        "confidence": conf,
        "uncertain": conf < THRESHOLD,
        "probabilities": {_names[i]: float(probs[i]) for i in order},
    }
