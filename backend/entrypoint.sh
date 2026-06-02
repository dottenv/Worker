#!/bin/sh
set -e

echo "Running database init..."
flask init-db

echo "Starting gunicorn..."
exec gunicorn --bind 0.0.0.0:5000 --workers 4 "app.run:app"
