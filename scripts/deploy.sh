#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
image=${1:?Usage: bash scripts/deploy.sh registry/owner/gradeflow:40-character-commit}
if [[ ! "$image" =~ :[a-f0-9]{40}$ && ! "$image" =~ @sha256:[a-f0-9]{64}$ ]]; then
  echo 'Require a full Git commit tag or sha256 digest' >&2; exit 1
fi
# Namespace and RBAC are bootstrapped separately; CI has no cluster-admin access.
manifest=$(mktemp)
trap 'rm -f "$manifest"' EXIT
kubectl set image --local -f k8s/deployment.yaml "web=$image" -o yaml > "$manifest"
kubectl apply -f k8s/service.yaml -f "$manifest"
bash scripts/verify-rollout.sh "$image"
