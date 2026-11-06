"""
model/evaluate.py
=================
Prints the evaluation numbers written by model/train.py.

The old version re-scored the model on the WHOLE data folder, which includes the images it
was trained on, so its accuracy was inflated. train.py now evaluates on a held-out test split
that is never used for training, and stores the result in inference/metrics.json. Quote only these.
"""
import json
import sys
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else "inference/metrics.json")
if not path.exists():
    sys.exit(f"{path} not found - run model/train.py first")
m = json.loads(path.read_text())
print(f"Held-out TEST accuracy: {m['test_accuracy']:.1%} on {m['test_images']} images (train: {m['train_images']})")
print(f"Split: {m['split']}")
for cls, r in m["per_class"].items():
    print(f"  {cls:<24} precision {r['precision']:.2f}  recall {r['recall']:.2f}  f1 {r['f1-score']:.2f}  n={int(r['support'])}")
print("Confusion matrix (rows = true, cols = predicted):")
for row in m["confusion_matrix"]:
    print("  ", row)
print("Caveat:", m["caveat"])
