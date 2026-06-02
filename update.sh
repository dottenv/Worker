#!/usr/bin/env bash
set -e

echo "=== Pulling latest changes ==="
git pull

GIT_HASH=$(git rev-parse --short HEAD)
export GIT_HASH

echo "=== Rebuilding frontend & backend (build ${GIT_HASH}) ==="
docker compose up -d --build frontend backend

echo "=== Done ==="
