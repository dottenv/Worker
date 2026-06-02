#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}   Worker — Production Setup (CloudPub)${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

info "Проверяю зависимости..."
for cmd in docker openssl; do
  if ! command -v "$cmd" &>/dev/null; then
    error "$cmd не найден"
    exit 1
  fi
done
ok "docker и openssl найдены"

if docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif docker-compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  error "docker compose не найден"
  exit 1
fi
ok "docker compose: $COMPOSE_CMD"

echo ""

info "Генерирую секретные ключи..."
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
ok "Секреты сгенерированы"

echo ""
info "CloudPub — сервис туннелирования с автоматическим HTTPS"
info "1. Зарегистрируйтесь на https://cloudpub.ru/dashboard"
info "2. Скопируйте токен из личного кабинета"
echo ""
read -rp "$(echo -e "${CYAN}Токен CloudPub:${NC} ")" CLOUDPUB_TOKEN
if [ -z "$CLOUDPUB_TOKEN" ]; then
  error "Токен обязателен"
  exit 1
fi
ok "Токен сохранён"

DATABASE_URL="sqlite:////data/app.db"
ok "База данных: $DATABASE_URL"

echo ""
info "Для использования своего домена (app.appsht.ru):"
info "  1. Опубликуйте сервис через CloudPub — получите URL вида https://xxx.cloudpub.ru"
info "  2. В личном кабинете CloudPub → Домены → Добавить домен"
info "  3. Настройте CNAME-запись у регистратора согласно инструкции CloudPub"
echo ""

cat > "$ENV_FILE" <<EOF
SECRET_KEY=${SECRET_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
DATABASE_URL=${DATABASE_URL}
CLOUDPUB_TOKEN=${CLOUDPUB_TOKEN}
EOF

ok ".env записан"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   Настройка завершена!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "  $COMPOSE_CMD --env-file .env up --build -d"
echo ""

echo -e "${YELLOW}После запуска выполните:${NC}"
echo "  docker compose logs cloudpub    # посмотреть URL сервиса"
echo ""
