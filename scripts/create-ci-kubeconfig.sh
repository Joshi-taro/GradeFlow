#!/usr/bin/env bash
# Run as the cluster administrator, never in a PR job. Token expires in <=24h.
set -euo pipefail
output=${1:?Usage: bash scripts/create-ci-kubeconfig.sh /secure/path/ci-kubeconfig}
umask 077
[[ ! -e "$output" ]] || { echo 'Refusing to overwrite an existing credential' >&2; exit 1; }
ca=$(mktemp)
trap 'rm -f "$ca"' EXIT
kubectl config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 -d > "$ca"
token=$(kubectl -n gradeflow create token gradeflow-deployer --duration=24h)
kubectl --kubeconfig="$output" config set-cluster gradeflow --server=https://127.0.0.1:16443 --certificate-authority="$ca" --embed-certs >/dev/null
kubectl --kubeconfig="$output" config set-credentials deployer --token="$token" >/dev/null
kubectl --kubeconfig="$output" config set-context gradeflow --cluster=gradeflow --user=deployer --namespace=gradeflow >/dev/null
kubectl --kubeconfig="$output" config use-context gradeflow >/dev/null
chmod 600 "$output"
echo 'Created scoped credential; rotate it before expiry and protect it as a secret.'
