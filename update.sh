#!/usr/bin/env bash
set -e

echo "=== Pulling latest changes ==="
git pull

echo "=== Rebuilding frontend & backend ==="
docker compose up -d --build frontend backend

echo "=== Done ==="
