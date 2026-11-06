"""
model/train.py
==============
Train the PotatoGuard leaf-disease classifier (MobileNetV2 transfer learning).

What this script guarantees (the old version did not):
  * A real, stratified 70/15/15 train / validation / TEST split by file. The test
    split is never seen during training or model selection.
  * Class order is written to inference/labels.json so the API can never mislabel.
  * Pre-processing is INSIDE the model, so the API only has to resize to 224x224.
  * Metrics (accuracy, per-class precision/recall/F1, confusion matrix) come from the
    held-out test split only and are saved to inference/metrics.json.

Expected data layout (PlantVillage potato folders, one folder per class):
    model/data/Potato___Early_blight/*.JPG
    model/data/Potato___healthy/*.JPG
    model/data/Potato___Late_blight/*.JPG
    (add more class folders, e.g. your own field photos or Bacterial_wilt images,
     as additional sub-folders - they are picked up automatically)

Run (free GPU on Kaggle/Colab recommended):
    python model/train.py --data-dir model/data --epochs 12 --fine-tune-epochs 8
Smoke test without internet / pretrained weights:
    python model/train.py --data-dir <tiny dir> --no-pretrained --epochs 1 --fine-tune-epochs 0
"""

import argparse
import json
import os
import random
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

IMG_SIZE = (224, 224)
EXTS = {".jpg", ".jpeg", ".png", ".bmp"}
SEED = 42


def display_name(folder):
    """'Potato___Late_blight' -> 'Late Blight'."""
    return folder.replace("Potato___", "").replace("_", " ").strip().title()


def list_files(data_dir):
    classes = sorted((d.name for d in Path(data_dir).iterdir() if d.is_dir() and not d.name.startswith(".")), key=str.lower)  # case-insensitive: Early, healthy, Late
    if len(classes) < 2:
        raise SystemExit(f"Need at least 2 class folders in {data_dir}, found {classes}")
    paths, labels = [], []
    for idx, cls in enumerate(classes):
        files = [p for p in (Path(data_dir) / cls).rglob("*") if p.suffix.lower() in EXTS]
        if not files:
            raise SystemExit(f"Class folder {cls} contains no images")
        paths += [str(p) for p in files]
        labels += [idx] * len(files)
    return classes, np.array(paths), np.array(labels)


def make_ds(paths, labels, batch, training):
    def load(path, y):
        img = tf.io.decode_image(tf.io.read_file(path), channels=3, expand_animations=False)
        img = tf.image.resize(img, IMG_SIZE)
        img.set_shape((*IMG_SIZE, 3))
        return img, y

    ds = tf.data.Dataset.from_tensor_slices((paths, labels))
    if training:
        ds = ds.shuffle(len(paths), seed=SEED)
    return ds.map(load, num_parallel_calls=tf.data.AUTOTUNE).batch(batch).prefetch(tf.data.AUTOTUNE)


def build_model(num_classes, pretrained):
    aug = tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal_and_vertical"),
            tf.keras.layers.RandomRotation(0.15),
            tf.keras.layers.RandomZoom(0.2),
            tf.keras.layers.RandomContrast(0.2),
            tf.keras.layers.RandomBrightness(0.2, value_range=(0, 255)),
        ],
        name="augmentation",
    )
    base = tf.keras.applications.MobileNetV2(
        input_shape=(*IMG_SIZE, 3), include_top=False, weights="imagenet" if pretrained else None
    )
    base.trainable = False
    inputs = tf.keras.Input(shape=(*IMG_SIZE, 3), name="image_0_255")
    x = aug(inputs)  # augmentation layers are inactive at inference time
    x = tf.keras.layers.Rescaling(1 / 127.5, offset=-1, name="to_minus1_1")(x)  # MobileNetV2 expectation
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="probs")(x)
    return tf.keras.Model(inputs, outputs), base


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default="model/data")
    ap.add_argument("--out-dir", default="inference")
    ap.add_argument("--epochs", type=int, default=12)
    ap.add_argument("--fine-tune-epochs", type=int, default=8)
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--no-pretrained", action="store_true", help="smoke tests only; gives a useless model")
    args = ap.parse_args()

    random.seed(SEED), np.random.seed(SEED), tf.random.set_seed(SEED)
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    classes, paths, labels = list_files(args.data_dir)
    print("Classes (index order):", classes)
    print({c: int((labels == i).sum()) for i, c in enumerate(classes)})

    p_train, p_rest, y_train, y_rest = train_test_split(paths, labels, test_size=0.30, stratify=labels, random_state=SEED)
    p_val, p_test, y_val, y_test = train_test_split(p_rest, y_rest, test_size=0.50, stratify=y_rest, random_state=SEED)
    print(f"train={len(p_train)} val={len(p_val)} test={len(p_test)}")

    train_ds = make_ds(p_train, y_train, args.batch_size, True)
    val_ds = make_ds(p_val, y_val, args.batch_size, False)
    test_ds = make_ds(p_test, y_test, args.batch_size, False)

    counts = np.bincount(y_train, minlength=len(classes))
    class_weight = {i: float(len(y_train) / (len(classes) * max(c, 1))) for i, c in enumerate(counts)}

    model, base = build_model(len(classes), pretrained=not args.no_pretrained)
    cbs = [tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True)]

    model.compile(tf.keras.optimizers.Adam(1e-3), "sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, class_weight=class_weight, callbacks=cbs)

    if args.fine_tune_epochs > 0 and not args.no_pretrained:
        base.trainable = True
        for layer in base.layers[:-30]:  # keep early layers frozen
            layer.trainable = False
        model.compile(tf.keras.optimizers.Adam(1e-5), "sparse_categorical_crossentropy", metrics=["accuracy"])
        model.fit(train_ds, validation_data=val_ds, epochs=args.fine_tune_epochs, class_weight=class_weight, callbacks=cbs)

    # ---- Held-out TEST evaluation (the only numbers you may quote) ----
    probs = model.predict(test_ds, verbose=0)
    y_pred = probs.argmax(axis=1)
    acc = float((y_pred == y_test).mean())
    report = classification_report(y_test, y_pred, target_names=classes, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=range(len(classes)))
    print(classification_report(y_test, y_pred, target_names=classes, zero_division=0))

    model.save(out / "model.keras")
    (out / "labels.json").write_text(json.dumps({"classes": classes, "display_names": [display_name(c) for c in classes]}, indent=2))
    (out / "metrics.json").write_text(
        json.dumps(
            {
                "test_accuracy": acc,
                "test_images": int(len(y_test)),
                "train_images": int(len(y_train)),
                "per_class": {c: report[c] for c in classes},
                "confusion_matrix": cm.tolist(),
                "split": "stratified 70/15/15 by file, seed 42",
                "pretrained": not args.no_pretrained,
                "caveat": "PlantVillage photos are lab-style; accuracy on real field photos will be lower. Measure it with your own field images.",
            },
            indent=2,
        )
    )
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(5, 4))
        ax.imshow(cm, cmap="Blues")
        ax.set_xticks(range(len(classes)), [display_name(c) for c in classes], rotation=30, ha="right")
        ax.set_yticks(range(len(classes)), [display_name(c) for c in classes])
        for i in range(len(classes)):
            for j in range(len(classes)):
                ax.text(j, i, cm[i, j], ha="center", va="center")
        ax.set_xlabel("Predicted"), ax.set_ylabel("True"), ax.set_title("Test-set confusion matrix")
        fig.tight_layout()
        fig.savefig(out / "confusion_matrix.png", dpi=150)
    except Exception as e:  # noqa: BLE001
        print("Could not draw confusion matrix:", e)

    print(f"\nHeld-out TEST accuracy: {acc * 100:.1f}% on {len(y_test)} images")
    print(f"Saved model + labels + metrics to {out}/")


if __name__ == "__main__":
    main()
