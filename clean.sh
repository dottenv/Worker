#!/usr/bin/env bash
set -euo pipefail

echo "=== Полная зачистка Docker ==="

# Остановить всё
docker compose --env-file .env down 2>/dev/null || true

# Удалить ВСЕ volume проекта
docker volume rm worker_app_data worker_acme_data 2>/dev/null || true

# Удалить все контейнеры проекта
docker rm -f traefik sc-backend sc-frontend 2>/dev/null || true

# Удалить сеть
docker network rm worker_app_network 2>/dev/null || true

# Удалить старые образы
docker image prune -f 2>/dev/null || true

echo "=== Готово. Запускаю с нуля ==="

# Пересобрать и запустить
docker compose --env-file .env up --build -d

echo "=== Жду 10 секунд для инициализации ==="
sleep 10

echo "=== Логи ==="
docker compose logs --tail=30
