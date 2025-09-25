#!/usr/bin/env bash
set -euo pipefail

# Build frontend bundle into react-app/dist and package as tar.gz
# Usage:
#   bash react-app/build.sh              # build using current env
#   VITE_API_URL=/api bash react-app/build.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[frontend] Installing dependencies (npm ci)"
npm ci

echo "[frontend] Building (npm run build)"
# Vite picks up VITE_* env vars from shell
npm run build

OUT=dist
PKG="dist-$(date +%Y%m%d_%H%M%S).tar.gz"
echo "[frontend] Packaging $OUT -> $PKG"
tar -czf "$PKG" -C "$OUT" .

echo "[ok] Bundle: $SCRIPT_DIR/$OUT"
echo "[ok] Package: $SCRIPT_DIR/$PKG"

