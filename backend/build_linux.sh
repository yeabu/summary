#!/usr/bin/env bash
set -euo pipefail

# Build static Linux amd64 binary for the backend into backend/server-linux-amd64
# Usage: bash backend/build_linux.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR/backend"

echo "[build] GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o server-linux-amd64 ."
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o server-linux-amd64 .

echo "[ok] Output: $(pwd)/server-linux-amd64"

