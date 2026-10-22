#!/usr/bin/env bash
# Run inside Ubuntu/WSL, as the user who will run the Jenkins host agent.
# Docker Engine/Desktop must already be installed and available to this user.
set -euo pipefail
case "$(uname -m)" in
  x86_64) arch=amd64; nodearch=x64 ;;
  aarch64) arch=arm64; nodearch=arm64 ;;
  *) echo 'Unsupported architecture' >&2; exit 1 ;;
esac
sudo apt-get update
sudo apt-get install -y ca-certificates curl unzip xz-utils git python3-venv openjdk-21-jre-headless
mkdir -p "$HOME/.local/bin" "$HOME/.local/lib"
temp=$(mktemp -d)
trap 'rm -rf "$temp"' EXIT
cd "$temp"
curl -fsSLO "https://nodejs.org/dist/v24.15.0/node-v24.15.0-linux-${nodearch}.tar.xz"
curl -fsSLO https://nodejs.org/dist/v24.15.0/SHASUMS256.txt
grep " node-v24.15.0-linux-${nodearch}.tar.xz$" SHASUMS256.txt | sha256sum -c -
tar -xJf "node-v24.15.0-linux-${nodearch}.tar.xz" -C "$HOME/.local/lib"
for exe in node npm npx; do ln -sf "$HOME/.local/lib/node-v24.15.0-linux-${nodearch}/bin/$exe" "$HOME/.local/bin/$exe"; done
curl -fsSLo kind "https://github.com/kubernetes-sigs/kind/releases/download/v0.33.0/kind-linux-${arch}"
curl -fsSLo kind.sha256 "https://github.com/kubernetes-sigs/kind/releases/download/v0.33.0/kind-linux-${arch}.sha256sum"
printf '%s  kind\n' "$(cut -d ' ' -f1 kind.sha256)" | sha256sum -c -
curl -fsSLo kubectl "https://dl.k8s.io/release/v1.36.4/bin/linux/${arch}/kubectl"
curl -fsSLo kubectl.sha256 "https://dl.k8s.io/release/v1.36.4/bin/linux/${arch}/kubectl.sha256"
printf '%s  kubectl\n' "$(cat kubectl.sha256)" | sha256sum -c -
curl -fsSLO "https://releases.hashicorp.com/terraform/1.16.3/terraform_1.16.3_linux_${arch}.zip"
curl -fsSLO https://releases.hashicorp.com/terraform/1.16.3/terraform_1.16.3_SHA256SUMS
grep " terraform_1.16.3_linux_${arch}.zip$" terraform_1.16.3_SHA256SUMS | sha256sum -c -
unzip -q "terraform_1.16.3_linux_${arch}.zip" terraform
install -m 0755 kind kubectl terraform "$HOME/.local/bin/"
echo 'Run: export PATH="$HOME/.local/bin:$PATH" (also set this in your Jenkins agent shell).'
