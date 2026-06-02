#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"
COMPOSE_FILE="docker-compose.yml"

# ─── Colors ───
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

# ─── Check prerequisites ───
info "Проверяю зависимости..."
for cmd in docker openssl; do
  if ! command -v "$cmd" &>/dev/null; then
    error "$cmd не найден. Установите $cmd и попробуйте снова."
    exit 1
  fi
done
ok "docker и openssl найдены"

# Check docker compose
if docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif docker-compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  error "docker compose не найден"
  exit 1
fi
ok "docker compose доступен: $COMPOSE_CMD"

echo ""

# ─── Secrets ───
info "Генерирую секретные ключи..."
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
ok "Секреты сгенерированы"

# ─── Email ───
echo ""
read -rp "$(echo -e ${CYAN}Email для Let\'s Encrypt [admin@appsht.ru]:${NC} ) " LETSENCRYPT_EMAIL
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-admin@appsht.ru}"
ok "Email: $LETSENCRYPT_EMAIL"

# ─── Domains ───
echo ""
read -rp "$(echo -e ${CYAN}Frontend домен [app.appsht.ru]:${NC} ) " APP_DOMAIN
APP_DOMAIN="${APP_DOMAIN:-app.appsht.ru}"

read -rp "$(echo -e ${CYAN}API домен [api.appsht.ru]:${NC} ) " API_DOMAIN
API_DOMAIN="${API_DOMAIN:-api.appsht.ru}"
ok "Домены: $APP_DOMAIN / $API_DOMAIN"

# ─── Let's Encrypt mode ───
echo ""
echo -e "${YELLOW}Let's Encrypt:${NC}"
echo "  1) staging  — тестовый (нет лимитов, сертификат непроверенный)"
echo "  2) prod     — боевой  (валидный сертификат)"
read -rp "$(echo -e ${CYAN}Режим [1]:${NC} ) " LE_MODE
LE_MODE="${LE_MODE:-1}"

if [ "$LE_MODE" = "2" ]; then
  CERT_RESOLVER="letsencrypt"
  ok "Режим: PRODUCTION"
else
  CERT_RESOLVER="letsencrypt-staging"
  warn "Режим: STAGING (сертификат будет непроверенным)"
fi

# ─── Database URL ───
DATABASE_URL="sqlite:////data/app.db"
ok "База данных: $DATABASE_URL"

# ─── VAPID keys (optional) ───
echo ""
read -rp "$(echo -e "${CYAN}VAPID Private Key [Enter = skip]:${NC} ")" VAPID_PRIVATE_KEY
read -rp "$(echo -e "${CYAN}VAPID Public Key  [Enter = skip]:${NC} ")" VAPID_PUBLIC_KEY

# ─── Write .env ───
info "Записываю .env..."
cat > "$ENV_FILE" <<EOF
SECRET_KEY=${SECRET_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL}
APP_DOMAIN=${APP_DOMAIN}
API_DOMAIN=${API_DOMAIN}
CERT_RESOLVER=${CERT_RESOLVER}
DATABASE_URL=${DATABASE_URL}
EOF

if [ -n "${VAPID_PRIVATE_KEY:-}" ]; then
  echo "VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}" >> "$ENV_FILE"
fi
if [ -n "${VAPID_PUBLIC_KEY:-}" ]; then
  echo "VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}" >> "$ENV_FILE"
fi

ok ".env записан"

# ─── Write .env for backend ───
info "Записываю backend/.env..."
cat > "backend/.env" <<EOF
SECRET_KEY=${SECRET_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
DATABASE_URL=${DATABASE_URL}
EOF

if [ -n "${VAPID_PRIVATE_KEY:-}" ]; then
  echo "VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}" >> "backend/.env"
fi
if [ -n "${VAPID_PUBLIC_KEY:-}" ]; then
  echo "VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}" >> "backend/.env"
fi

ok "backend/.env записан"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   Настройка завершена!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "  Домены:"
echo "    - https://${APP_DOMAIN}"
echo "    - https://${API_DOMAIN}"
echo ""
echo "  Режим SSL: ${CERT_RESOLVER}"
echo ""
echo "  Следующий шаг:"
if [ "$CERT_RESOLVER" = "letsencrypt" ]; then
  echo -e "  ${YELLOW}Убедитесь что DNS A-записи для ${APP_DOMAIN} и ${API_DOMAIN}${NC}"
  echo -e "  ${YELLOW}указывают на IP этого сервера!${NC}"
  echo ""
fi
echo "  $COMPOSE_CMD --env-file .env up --build -d"
echo ""
echo "  Логи:"
echo "  $COMPOSE_CMD logs -f"
echo ""
