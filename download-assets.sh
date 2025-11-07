#!/usr/bin/env bash
set -euo pipefail

# We use a script to download the perch model since it's very large, and likely
# to change over time.
# Additionally, we don't want to use Git LFS for the model because it would use
# the Git LFS quota very quickly.

# Downloads perch model from:
# https://huggingface.co/justinchuby/Perch-onnx
curl https://huggingface.co/justinchuby/Perch-onnx/resolve/main/perch_v2.onnx?download=true -o public/perch_v2.onnx
