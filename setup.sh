#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/dottenv/Worker.git"
ENV_FILE=".env"

RED='\033[0;31m';   GREEN='\033[0;32m'
YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# ─── Проверка зависимостей ───
info "Проверяю зависимости..."
for cmd in docker git openssl; do
  if ! command -v "$cmd" &>/dev/null; then
    error "$cmd не найден. Установите $cmd и повторите."
    exit 1
  fi
done

if docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif docker-compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  error "docker compose не найден"
  exit 1
fi
ok "docker, git, openssl, $COMPOSE_CMD найдены"

# ─── Определяем режим: установка или обновление ───
IS_UPDATE=false
if [ -f "docker-compose.yml" ] && [ -d ".git" ]; then
  IS_UPDATE=true
fi

echo ""
if [ "$IS_UPDATE" = true ]; then
  echo -e "${CYAN}════════════════════════════════════════${NC}"
  echo -e "${CYAN}   Worker — Обновление${NC}"
  echo -e "${CYAN}════════════════════════════════════════${NC}"
  echo ""

  # ─── ОБНОВЛЕНИЕ ───
  info "Сохраняю локальные изменения..."
  git stash --include-untracked 2>/dev/null || true

  info "Загружаю свежий код из git..."
  git pull

  info "Восстанавливаю локальные изменения..."
  git stash pop 2>/dev/null || true

  GIT_HASH=$(git rev-parse --short HEAD)
  export GIT_HASH
  ok "Код обновлён (${GIT_HASH})"

  echo ""

  # ─── Очистка мусора ───
  info "Останавливаю контейнеры frontend и backend..."
  $COMPOSE_CMD down --remove-orphans frontend backend 2>/dev/null || true

  info "Удаляю старые образы и кеш сборки..."
  docker image prune -f 2>/dev/null || true
  docker builder prune -f 2>/dev/null || true

  info "Удаляю билд-кеш node_modules (dev-dist)..."
  rm -rf frontend/dev-dist frontend/node_modules 2>/dev/null || true

  ok "Мусор удалён. data/ и cloudpub НЕ тронуты."

  echo ""

  # ─── Сборка и запуск (без cloudpub) ───
  info "Собираю и запускаю frontend и backend..."
  $COMPOSE_CMD up --build -d frontend backend

  echo ""
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo -e "${GREEN}   Обновление завершено!${NC}"
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${CYAN}Публичный URL (не изменился):${NC}"
  echo "  docker compose logs cloudpub"
  echo ""
  echo -e "  ${CYAN}Логи приложения:${NC}"
  echo "  docker compose logs -f"
  echo ""

else
  # ─── ПОЛНАЯ УСТАНОВКА ───
  echo -e "${CYAN}════════════════════════════════════════${NC}"
  echo -e "${CYAN}   Worker — Полная установка${NC}"
  echo -e "${CYAN}════════════════════════════════════════${NC}"
  echo ""

  # Клонирование
  if [ -d "Worker" ]; then
    warn "Каталог Worker уже существует. Обновляю..."
    cd Worker
    git stash --include-untracked 2>/dev/null || true
    git pull
    git stash pop 2>/dev/null || true
  else
    info "Клонирую репозиторий..."
    git clone "$REPO_URL"
    cd Worker
  fi
  ok "Репозиторий готов"

  echo ""

  # Генерация секретов
  info "Генерирую секретные ключи..."
  SECRET_KEY=$(openssl rand -hex 32)
  JWT_SECRET_KEY=$(openssl rand -hex 32)
  ok "Секреты сгенерированы"

  echo ""

  # CloudPub токен
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

  echo ""

  # Запись .env
  DATABASE_URL="sqlite:////data/app.db"
  cat > "$ENV_FILE" <<EOF
SECRET_KEY=${SECRET_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
DATABASE_URL=${DATABASE_URL}
CLOUDPUB_TOKEN=${CLOUDPUB_TOKEN}
EOF
  ok ".env записан"

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
fi
