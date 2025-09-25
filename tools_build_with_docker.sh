#!/usr/bin/env bash
# Helper: build via Docker BuildKit (no Go toolchain needed)
DOCKER_BUILDKIT=1 docker build --target builder --output type=local,dest=./backend/dist -f docker/Dockerfile.backend .
 echo 'Binary at backend/dist/out/server'
