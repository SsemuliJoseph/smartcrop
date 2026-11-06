"""
model/check_model.py
====================
Find out, from a few labelled images, which PRE-PROCESSING and which CLASS ORDER your .h5 expects.
Use it BEFORE import_h5.py when you are not 100% sure how the model was trained.

  python model/check_model.py --h5 potatoguard_model.h5 --test-dir sample_images/

sample_images/ has one sub-folder per class (any names containing 'early', 'late', 'healthy'),
~20+ images each, ideally NOT used for training. It tries every pre-processing option and every
class order and prints accuracy for each; the best row is what you pass to import_h5.py.
Only needs tensorflow + pillow + numpy.
"""
import argparse
import itertools
from pathlib import Path

import numpy as np
import tensorflow as tf

EXTS = {".jpg", ".jpeg", ".png", ".bmp"}
PRE = {
    "rescale_255": lambda x: x / 255.0,
    "mobilenet_v2": lambda x: x / 127.5 - 1.0,
    "none": lambda x: x,
}


def load(path):
    img = tf.io.decode_image(tf.io.read_file(str(path)), channels=3, expand_animations=False)
    return tf.image.resize(img, (224, 224)).numpy().astype("float32")


def pretty(name):
    low = name.lower()
    for key, nice in (("early", "Early Blight"), ("late", "Late Blight"), ("health", "Healthy")):
        if key in low:
            return nice
    return name


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--h5", required=True)
    ap.add_argument("--test-dir", required=True)
    a = ap.parse_args()

    folders = sorted(p for p in Path(a.test_dir).iterdir() if p.is_dir())
    xs, ys = [], []
    for i, d in enumerate(folders):
        files = [f for f in d.rglob("*") if f.suffix.lower() in EXTS]
        print(f"folder {i}: {d.name}  ({len(files)} images)")
        for f in files:
            xs.append(load(f)); ys.append(i)
    x, y = np.stack(xs), np.array(ys)

    model = tf.keras.models.load_model(a.h5, compile=False)
    n = model.output_shape[-1]
    if n != len(folders):
        raise SystemExit(f"Model has {n} outputs but you gave {len(folders)} class folders.")

    rows = []
    for pname, fn in PRE.items():
        probs = model.predict(fn(x), verbose=0)
        pred = probs.argmax(axis=1)
        # model output index -> folder index, for every possible class order
        for perm in itertools.permutations(range(n)):
            acc = float((np.array(perm)[pred] == y).mean())
            rows.append((acc, pname, perm))
    rows.sort(key=lambda r: -r[0])

    print("\nTop results (accuracy on the images you supplied):")
    for acc, pname, perm in rows[:6]:
        order = [pretty(folders[perm.index(k)].name) for k in range(n)]
        print(f"  {acc:6.1%}  preprocess={pname:13s} model output order = {order}")
    best = rows[0]
    order = [pretty(folders[best[2].index(k)].name) for k in range(n)]
    print(f"\n==> Use:  --preprocess {best[1]}  --classes \"{','.join(order)}\"")
    if best[0] < 0.8:
        print("    WARNING: best accuracy is low. The model may expect a different input size/preprocessing, or these "
              "images are very different from the training data.")
    runner_up = next((r for r in rows[1:] if r[1] != best[1]), None)
    if runner_up and best[0] - runner_up[0] < 0.05:
        print("    NOTE: two preprocessing options score almost the same; supply more images to tell them apart.")


if __name__ == "__main__":
    main()
