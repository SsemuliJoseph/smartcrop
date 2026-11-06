# PotatoGuard – deployment (no AWS, no secrets)

Path: **photo → model (on-device ONNX, or a small free server) → diagnosis → shown in the app; history stays on the device.**
Nothing fabricates results: with no service configured the apps refuse to diagnose.

## 1. Get a model into `inference/`

**A. You already have a trained `.h5`** (recommended if it was measured on unseen images)
```bash
pip install -r model/requirements.txt
python model/import_h5.py --h5 potatoguard_model.h5 \
    --preprocess rescale_255 \
    --classes "Early Blight,Late Blight,Healthy" \
    --test-dir heldout_test/        # images NEVER used in training, one sub-folder per class
```
* `--classes` = your **training label order** (`train_generator.class_indices`; Keras `flow_from_directory` is case-sensitive
  alphabetical: `Potato___Early_blight`, `Potato___Late_blight`, `Potato___healthy`). A wrong order makes the app confidently name the wrong disease.
* `--preprocess`: `rescale_255` (trained with `rescale=1/255`), `mobilenet_v2` (`preprocess_input`), or `none` (model has it built in).
* Without `--test-dir`, no accuracy is recorded. A figure only counts if measured on images the model never trained on.

**B. Train from scratch** (free Kaggle/Colab GPU, ~30 min)
```python
!pip install -q kagglehub
import kagglehub, shutil, glob, os
src = kagglehub.dataset_download("emmarex/plantdisease")
os.makedirs("model/data", exist_ok=True)
for d in glob.glob(f"{src}/**/Potato___*", recursive=True):
    shutil.copytree(d, f"model/data/{os.path.basename(d)}", dirs_exist_ok=True)
!git clone https://github.com/SsemuliJoseph/Smart-Crop && cd Smart-Crop && pip install -q -r model/requirements.txt
!cd Smart-Crop && python model/train.py --data-dir ../model/data --epochs 12 --fine-tune-epochs 8 && python model/evaluate.py
```
Either way you get `inference/model.keras`, `labels.json` and (if measured) `metrics.json`. Quote only numbers from `metrics.json`.

Honest limits: PlantVillage has **no Bacterial Wilt** class and its photos are lab-style; measure accuracy on real field photos too.

## 2. Deploy (free) - three options

> Hugging Face now charges for Docker/Gradio Spaces on a free account (only Static Spaces are free), so the
> default path no longer uses it.

**Option A - on-device model, no server (default, recommended).** The model runs in the browser through
ONNX Runtime Web. Netlify just serves static files: no cold start, no quota, works for any number of users.
```
web-model/model.onnx + labels.json   <- the converted model (9.6 MB)
web-inference.js                     <- loads it and predicts
config.js                            <- INFERENCE_URL: ''   (empty = run on-device)
```
Push to GitHub; Netlify (build command empty, publish directory `.`) redeploys automatically.
Re-create `model.onnx` after retraining: `python -m tf2onnx.convert --keras` is not supported for Keras 3, so use
```python
import tensorflow as tf, tf2onnx
m = tf.keras.models.load_model("inference/model.keras", compile=False)
tf2onnx.convert.from_keras(m, input_signature=(tf.TensorSpec((None,224,224,3), tf.float32, name="input"),),
                           opset=17, output_path="web-model/model.onnx")
```

**Option B - small server for the mobile app (Render free web service).** Uses `Dockerfile.render`
(ONNX Runtime, ~150 MB RAM, fits the 512 MB free instance). Render > New > Web Service > this repo >
Runtime Docker > Dockerfile path `./Dockerfile.render` > Free. Then `https://<name>.onrender.com/health`.
Free instances sleep after ~15 min idle (first call takes ~30-60 s) - open `/health` before a demo.
Point the apps at it: `INFERENCE_URL` in `config.js` / `EXPO_PUBLIC_INFERENCE_URL` in `frontend/.env`.

**Option C - Google Cloud Run** (same `Dockerfile.render`, scales to zero, generous free quota, needs a billing card).

## 3. Point the apps at it

* **Web:** Option A needs nothing. For B/C set `config.js` -> `INFERENCE_URL: 'https://<your-service-url>'`.
* **Mobile (on-device, default):** `cd frontend && cp .env.example .env`, keep `EXPO_PUBLIC_ENGINE_URL` = your Netlify URL
  (it serves `engine.html`) and leave `EXPO_PUBLIC_INFERENCE_URL` empty, then `npm ci && npx expo start` and open in Expo Go.
  The **LocalScan** screen runs the model inside a hidden WebView on the phone (first scan downloads ~10 MB; needs internet once).
  Deploy the web app to Netlify *first* so `https://<netlify-url>/engine.html` exists.
* **Mobile (server):** set `EXPO_PUBLIC_INFERENCE_URL` (Option B/C); the Home button then uses the server flow.
  `assets/*.png` are placeholder icons - replace before any store submission.

## 4. Verify
```bash
python -m pytest tests -v
curl https://<your-service-url>/health
curl -X POST --data-binary @leaf.jpg https://<your-service-url>/predict
```
`tests/test_model.py` fails if the model on disk has < 90 % held-out accuracy or < 100 test images.
