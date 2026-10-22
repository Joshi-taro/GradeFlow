#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
image=${1:?Usage: bash scripts/local-deploy.sh gradeflow:FULL_COMMIT_SHA}
[[ "$image" =~ ^gradeflow:[a-f0-9]{40}$ ]] || { echo 'Require gradeflow:full-commit-sha' >&2; exit 1; }
export KUBECONFIG="${HOME}/.config/gradeflow/kubeconfig"
[[ $(kubectl config current-context) == kind-gradeflow ]] || { echo 'Refusing non-GradeFlow context' >&2; exit 1; }
kind load docker-image --name gradeflow "$image"
bash scripts/deploy.sh "$image"
bash scripts/deploy-smoke.sh
