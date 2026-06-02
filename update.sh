#!/usr/bin/env bash
set -e

echo "=== Stashing local changes ==="
git stash --include-untracked || true

echo "=== Pulling latest changes ==="
git pull

echo "=== Restoring stashed changes ==="
git stash pop || true

GIT_HASH=$(git rev-parse --short HEAD)
export GIT_HASH

echo "=== Rebuilding frontend & backend (build ${GIT_HASH}) ==="
docker compose up -d --build frontend backend

echo "=== Done ==="
