"""
model/import_h5.py
==================
Convert a model you already trained and saved as .h5 into the artifacts the inference service
expects (inference/model.keras + labels.json [+ metrics.json]).

Why this exists: the service sends raw 0-255 pixels and expects pre-processing to live INSIDE the
model. A model trained with `rescale=1/255` (the old train.py) or MobileNetV2 `preprocess_input`
would silently give wrong answers if fed raw pixels, so this script wraps your model with the
matching Rescaling layer. It also pins the class order, which is the other classic silent bug.

You must tell it two things only you know:
  --classes     class names IN THE ORDER OF YOUR TRAINING LABELS, i.e. train_generator.class_indices
                sorted by index. With Keras flow_from_directory that is CASE-SENSITIVE alphabetical,
                e.g. Potato___Early_blight, Potato___Late_blight, Potato___healthy
                -> --classes "Early Blight,Late Blight,Healthy"
  --preprocess  rescale_255 (x/255, what the old train.py used) | mobilenet_v2 (x/127.5-1) | none
                (model already contains its own preprocessing)

Optional but recommended: --test-dir <folder with one sub-folder per class> containing images that
were NEVER used for training. Metrics are computed on it and written to inference/metrics.json.
Without it no accuracy is recorded - the service will then show no accuracy figure.

Example:
  python model/import_h5.py --h5 potatoguard_model.h5 --preprocess rescale_255 \
      --classes "Early Blight,Late Blight,Healthy" --test-dir heldout_test/
"""
import argparse
import json
import re
from pathlib import Path

import numpy as np
import tensorflow as tf

EXTS = {".jpg", ".jpeg", ".png", ".bmp"}


def norm(name):
    return re.sub(r"\s+", " ", name.replace("Potato___", "").replace("_", " ")).strip().lower()


def load_image(path):
    img = tf.io.decode_image(tf.io.read_file(str(path)), channels=3, expand_animations=False)
    return tf.image.resize(img, (224, 224)).numpy().astype("float32")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--h5", required=True)
    ap.add_argument("--classes", required=True, help='comma-separated, in training label order')
    ap.add_argument("--preprocess", required=True, choices=["rescale_255", "mobilenet_v2", "none"])
    ap.add_argument("--test-dir")
    ap.add_argument("--out-dir", default="inference")
    a = ap.parse_args()

    names = [c.strip() for c in a.classes.split(",") if c.strip()]
    inner = tf.keras.models.load_model(a.h5, compile=False)
    shp = inner.input_shape
    if tuple(shp[1:]) != (224, 224, 3):
        raise SystemExit(f"Model expects input {shp}; the service resizes to 224x224x3 only.")
    n_out = inner.output_shape[-1]
    if n_out != len(names):
        raise SystemExit(f"Model has {n_out} outputs but you gave {len(names)} class names.")

    inp = tf.keras.Input((224, 224, 3), name="image_0_255")
    x = inp
    if a.preprocess == "rescale_255":
        x = tf.keras.layers.Rescaling(1 / 255.0, name="rescale_255")(x)
    elif a.preprocess == "mobilenet_v2":
        x = tf.keras.layers.Rescaling(1 / 127.5, offset=-1, name="to_minus1_1")(x)
    model = tf.keras.Model(inp, inner(x))

    probe = model.predict(np.random.uniform(0, 255, (4, 224, 224, 3)).astype("float32"), verbose=0)
    if not np.allclose(probe.sum(axis=1), 1.0, atol=1e-3):
        raise SystemExit("Model outputs do not sum to 1 (no softmax?). Add a softmax before importing.")

    out = Path(a.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    model.save(out / "model.keras")
    (out / "labels.json").write_text(json.dumps({"classes": names, "display_names": names}, indent=2))
    print(f"Saved {out}/model.keras and labels.json  (class order: {names})")

    if not a.test_dir:
        print("No --test-dir given: accuracy NOT recorded. Do not quote an accuracy you have not measured on unseen images.")
        return

    by_norm = {norm(n): i for i, n in enumerate(names)}
    xs, ys = [], []
    for d in sorted(p for p in Path(a.test_dir).iterdir() if p.is_dir()):
        if norm(d.name) not in by_norm:
            raise SystemExit(f"Test folder '{d.name}' does not match any class in {names}")
        for f in d.rglob("*"):
            if f.suffix.lower() in EXTS:
                xs.append(load_image(f)); ys.append(by_norm[norm(d.name)])
    y = np.array(ys)
    pred = model.predict(np.stack(xs), verbose=0).argmax(axis=1)
    from sklearn.metrics import classification_report, confusion_matrix

    rep = classification_report(y, pred, labels=range(len(names)), target_names=names, output_dict=True, zero_division=0)
    cm = confusion_matrix(y, pred, labels=range(len(names)))
    acc = float((pred == y).mean())
    print(classification_report(y, pred, labels=range(len(names)), target_names=names, zero_division=0))
    (out / "metrics.json").write_text(json.dumps({
        "test_accuracy": acc, "test_images": int(len(y)), "train_images": None,
        "per_class": {n: rep[n] for n in names}, "confusion_matrix": cm.tolist(),
        "split": f"user-supplied test folder ({a.test_dir}); must contain images never used for training",
        "pretrained": None,
        "caveat": "Accuracy is only meaningful if the test images were never used for training. Field photos will score lower than lab-style PlantVillage images.",
    }, indent=2))
    print(f"Held-out TEST accuracy: {acc:.1%} on {len(y)} images -> {out}/metrics.json")


if __name__ == "__main__":
    main()
