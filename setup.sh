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
echo -e "${CYAN}   Worker — Production Setup${NC}"
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
read -rp "$(echo -e "${CYAN}Email для SSL [admin@appsht.ru]:${NC} ")" LETSENCRYPT_EMAIL
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-admin@appsht.ru}"
ok "Email: $LETSENCRYPT_EMAIL"

echo ""
read -rp "$(echo -e "${CYAN}Frontend домен [app.appsht.ru]:${NC} ")" APP_DOMAIN
APP_DOMAIN="${APP_DOMAIN:-app.appsht.ru}"

read -rp "$(echo -e "${CYAN}API домен [api.appsht.ru]:${NC} ")" API_DOMAIN
API_DOMAIN="${API_DOMAIN:-api.appsht.ru}"
ok "Домены: $APP_DOMAIN / $API_DOMAIN"

DATABASE_URL="sqlite:////data/app.db"
ok "База данных: $DATABASE_URL"

echo ""
cat > "$ENV_FILE" <<EOF
SECRET_KEY=${SECRET_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL}
APP_DOMAIN=${APP_DOMAIN}
API_DOMAIN=${API_DOMAIN}
DATABASE_URL=${DATABASE_URL}
EOF

ok ".env записан"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   Настройка завершена!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "  $COMPOSE_CMD --env-file .env up --build -d"
echo ""
