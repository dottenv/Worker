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

info "CloudPub — сервис туннелирования с автоматическим HTTPS"
info "1. Зарегистрируйтесь на https://cloudpub.ru/dashboard"
info "2. Скопируйте токен из личного кабинета"
echo ""

if [ -f "$ENV_FILE" ] && grep -q "CLOUDPUB_TOKEN=" "$ENV_FILE" && [ -n "$(grep 'CLOUDPUB_TOKEN=' "$ENV_FILE" | cut -d= -f2)" ]; then
  warn "CloudPub токен уже есть в .env, пропускаю"
else
  read -rp "$(echo -e "${CYAN}Токен CloudPub:${NC} ")" CLOUDPUB_TOKEN
  if [ -z "$CLOUDPUB_TOKEN" ]; then
    error "Токен обязателен"
    exit 1
  fi
  ok "Токен сохранён"
fi

echo "=== Rebuilding frontend, backend & bot (build ${GIT_HASH}) ==="
docker compose down --remove-orphans frontend backend bot
docker compose up -d --build frontend backend bot



echo "=== Done ==="
