#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
log=$(mktemp)
kubectl -n gradeflow port-forward --address 127.0.0.1 service/gradeflow 18080:80 >"$log" 2>&1 &
forward_pid=$!
trap 'kill "$forward_pid" 2>/dev/null || true; rm -f "$log"' EXIT
ready=false
for attempt in {1..30}; do
  kill -0 "$forward_pid" 2>/dev/null || { cat "$log"; exit 1; }
  if curl -fsS http://127.0.0.1:18080/healthz >/dev/null; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || { cat "$log"; exit 1; }
node scripts/smoke.mjs http://127.0.0.1:18080
