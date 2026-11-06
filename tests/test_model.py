"""
tests/test_model.py
===================
Gate tests for the trained model. They SKIP (not pass) when no trained model is present,
and FAIL if the model on disk does not meet the bar - so a claim like "90% accuracy"
can only be made when metrics.json (written by model/train.py from the held-out TEST
split) actually supports it.

Override the location with MODEL_DIR (default: inference/).
"""

import json
import os

import numpy as np
import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_DIR = os.environ.get("MODEL_DIR", os.path.join(ROOT, "inference"))
MODEL_FILE = os.path.join(MODEL_DIR, "model.keras")
LABELS_FILE = os.path.join(MODEL_DIR, "labels.json")
METRICS_FILE = os.path.join(MODEL_DIR, "metrics.json")
MIN_TEST_ACCURACY = 0.90

pytestmark = pytest.mark.skipif(
    not (os.path.exists(MODEL_FILE) and os.path.exists(LABELS_FILE)),
    reason=f"No trained model in {MODEL_DIR}. Run model/train.py first.",
)


@pytest.fixture(scope="module")
def model():
    import tensorflow as tf

    return tf.keras.models.load_model(MODEL_FILE, compile=False)


def test_model_outputs_one_probability_per_label(model):
    labels = json.load(open(LABELS_FILE))["display_names"]
    out = model.predict(np.random.uniform(0, 255, (2, 224, 224, 3)).astype("float32"), verbose=0)
    assert out.shape == (2, len(labels))
    assert np.allclose(out.sum(axis=1), 1.0, atol=1e-3)


def test_labels_are_present_and_unique():
    names = json.load(open(LABELS_FILE))["display_names"]
    assert len(names) >= 2 and len(set(names)) == len(names)


def test_heldout_test_accuracy_meets_bar():
    assert os.path.exists(METRICS_FILE), "metrics.json missing - run model/train.py to produce it"
    m = json.load(open(METRICS_FILE))
    assert m["test_images"] >= 100, "Too few test images for the accuracy to mean anything"
    assert m["test_accuracy"] >= MIN_TEST_ACCURACY, (
        f"Held-out test accuracy {m['test_accuracy']:.1%} is below {MIN_TEST_ACCURACY:.0%}"
    )
