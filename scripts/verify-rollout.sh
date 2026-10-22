#!/usr/bin/env bash
set -euo pipefail
expected=${1:?Usage: bash scripts/verify-rollout.sh IMAGE}
kubectl -n gradeflow rollout status deployment/gradeflow --timeout=180s
actual=$(kubectl -n gradeflow get deployment gradeflow -o jsonpath='{.spec.template.spec.containers[0].image}')
[[ "$actual" == "$expected" ]] || { echo "Wrong image: $actual" >&2; exit 1; }
kubectl -n gradeflow get pods -l app=gradeflow -o wide
