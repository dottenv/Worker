#!/usr/bin/env bash
set -euo pipefail

echo "=== Полная зачистка Docker (БЕЗ удаления данных) ==="

# Остановить всё
docker compose --env-file .env down 2>/dev/null || true

# Удалить все контейнеры проекта
docker rm -f sc-backend sc-frontend cloudpub 2>/dev/null || true

# Удалить сеть
docker network rm worker_app_network 2>/dev/null || true

# Удалить старые образы
docker image prune -f 2>/dev/null || true

echo ""
echo "=== База данных и CloudPub конфиг НЕ ТРОНУТЫ ==="
echo "  data/          — SQLite база данных"
echo "  cloudpub-data/ — конфиг CloudPub (домен сохраняется)"
echo ""

# Пересобрать и запустить
docker compose --env-file .env up --build -d

echo "=== Жду 10 секунд для инициализации ==="
sleep 10

echo "=== Логи ==="
docker compose logs --tail=30
