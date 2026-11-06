# PotatoGuard – AI-Powered Irish Potato Leaf Disease Detection

**BSc Computer Science | Mbarara University of Science and Technology**

🚀 **Web demo:** https://chimerical-taiyaki-84a4c2.netlify.app/

A farmer photographs a potato leaf; a CNN (MobileNetV2) classifies it and the app shows treatment advice.
This version uses **no cloud-account services**: the model runs in a small FastAPI service (free Hugging Face Space)
and scan history is stored on the user's own device.

## How it fits together

```
Web app (Netlify) ─┐
                   ├─ POST /predict ─▶ inference/ (FastAPI + Keras model, Hugging Face Space)
Expo mobile app ───┘
history: browser localStorage / phone AsyncStorage (nothing stored server-side)
```

| Part | Tech |
| ---- | ---- |
| Web app | static HTML/JS (`index.html`, `app.js`, `config.js`), real weather from Open-Meteo |
| Mobile app | React Native + Expo (`frontend/`) |
| Model service | FastAPI + TensorFlow/Keras (`inference/`) |
| Model | MobileNetV2 transfer learning (`model/train.py`, or import an existing `.h5` with `model/import_h5.py`) |
| CI | GitHub Actions + pytest |

## Model accuracy

Accuracy is quoted **only** from the held-out test split in `inference/metrics.json` (`python model/evaluate.py`).
No figure is claimed here until a model has been trained/imported and measured that way.
Scope: **Early Blight, Late Blight, Healthy** (PlantVillage has no Bacterial Wilt class). PlantVillage images are lab-style, so field
accuracy must be measured separately with real field photos. Low-confidence photos are returned as "Uncertain".

## Status

| Component | Status |
| --------- | ------ |
| Inference API | 8 automated tests (health, predict, multipart, bad/oversized/empty input, uncertain, no-model 503) |
| Web app | Calls the service via `config.js`; refuses to diagnose if not configured |
| Mobile app | Bundles for Android + web; real screens wired; needs `EXPO_PUBLIC_INFERENCE_URL`; not yet run on a physical phone |
| Trained model | **Not in this repo** – see `docs/DEPLOY.md` |

## Quick start

```bash
pip install -r requirements.txt && python -m pytest tests -v          # service tests (model tests skip until a model exists)
uvicorn inference.app:app --port 8000                                  # needs inference/model.keras + labels.json
cd frontend && cp .env.example .env && npm ci && npx expo start       # mobile app
```

Full train → deploy → configure steps: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

## API (inference service)

`GET /health` → `{"status":"ok","classes":[...],"test_accuracy":...}`

`POST /predict` – body = raw image bytes (or multipart field `file`):

```json
{"disease":"Late Blight","confidence":0.97,"uncertain":false,
 "probabilities":{"Late Blight":0.97,"Early Blight":0.02,"Healthy":0.01}}
```
Errors: 400 invalid/empty image, 413 too large, 503 model not loaded (it never fabricates a result).

## Structure

```
index.html / app.js / config.js / styles.css   # web app
frontend/                                       # Expo mobile app
inference/                                      # FastAPI model service (+ Dockerfile)
model/  train.py  import_h5.py  evaluate.py     # training / import / metrics
tests/                                          # pytest suite
docs/DEPLOY.md                                  # deployment guide
```

GitHub: https://github.com/SsemuliJoseph/Smart-Crop
