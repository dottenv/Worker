#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/dottenv/Worker.git"
PROJECT_DIR="Worker"
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
echo -e "${CYAN}   Worker — Automated Production Setup${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

info "Проверяю зависимости..."
for cmd in docker git openssl; do
  if ! command -v "$cmd" &>/dev/null; then
    error "$cmd не найден. Установите $cmd и повторите."
    exit 1
  fi
done
ok "docker, git и openssl найдены"

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

if [ -d "$PROJECT_DIR" ]; then
  info "Каталог $PROJECT_DIR уже существует. Обновляю..."
  cd "$PROJECT_DIR"
  git stash --include-untracked 2>/dev/null || true
  git pull
  git stash pop 2>/dev/null || true
else
  info "Клонирую репозиторий..."
  git clone "$REPO_URL"
  cd "$PROJECT_DIR"
fi

ok "Репозиторий готов"

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

DATABASE_URL="sqlite:////data/app.db"
ok "База данных: $DATABASE_URL"

echo ""

info "Для использования своего домена (app.appsht.ru):"
info "  1. Опубликуйте сервис через CloudPub — получите URL вида https://xxx.cloudpub.ru"
info "  2. В личном кабинете CloudPub → Домены → Добавить домен"
info "  3. Настройте CNAME-запись у регистратора согласно инструкции CloudPub"

echo ""

if [ -n "${CLOUDPUB_TOKEN:-}" ]; then
  cat > "$ENV_FILE" <<EOF
SECRET_KEY=${SECRET_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
DATABASE_URL=${DATABASE_URL}
CLOUDPUB_TOKEN=${CLOUDPUB_TOKEN}
EOF
  ok ".env записан"
else
  info ".env уже существует, пропускаю"
fi

echo ""

info "Собираю и запускаю контейнеры..."
$COMPOSE_CMD --env-file .env up --build -d

echo ""

echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   Установка завершена!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Публичный URL:${NC}"
echo "  docker compose logs cloudpub"
echo ""
echo -e "  ${CYAN}Логи приложения:${NC}"
echo "  docker compose logs -f"
echo ""
echo -e "  ${YELLOW}Первый зарегистрировавшийся пользователь станет суперадмином${NC}"
echo ""

