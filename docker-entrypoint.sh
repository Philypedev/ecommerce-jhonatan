#!/bin/sh
# ============================================================
# Entrypoint do container TravelTech B2B.
#
# Responsável por:
#   1. Garantir que o diretório do SQLite existe (para o volume
#      persistente montado pelo EasyPanel em /data).
#   2. Se o banco já existe mas nunca teve _prisma_migrations
#      (foi criado via `prisma db push` em versões anteriores
#      do Dockerfile), marca a migration `init` como aplicada
#      antes do deploy — evita erro "table already exists".
#   3. Aplica migrations pendentes com `prisma migrate deploy`
#      (idempotente: no-op se tudo já está aplicado).
#   4. Inicia o Next.js em produção com `npm run start`.
#
# O `exec` no final garante que o Node substitui o shell,
# preservando sinais (SIGTERM do EasyPanel encerra graciosamente).
# ============================================================
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] ERRO: DATABASE_URL não definido no ambiente."
  echo "[entrypoint] Configure em EasyPanel -> Environment. Ex.: file:/data/prod.db"
  exit 1
fi

DB_PATH=$(printf '%s' "$DATABASE_URL" | sed 's|^file:||')
DB_DIR=$(dirname "$DB_PATH")

mkdir -p "$DB_DIR"

if [ -f "$DB_PATH" ]; then
  HAS_MIGRATIONS_TABLE=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='_prisma_migrations';" 2>/dev/null || echo 0)
  if [ "$HAS_MIGRATIONS_TABLE" = "0" ]; then
    echo "[entrypoint] Banco pré-existente sem _prisma_migrations detectado em $DB_PATH."
    echo "[entrypoint] Executando baseline: marcando 20260611003032_init como aplicada."
    npx prisma migrate resolve --applied 20260611003032_init
  fi
fi

echo "[entrypoint] Aplicando migrations pendentes (prisma migrate deploy)..."
npx prisma migrate deploy

echo "[entrypoint] Iniciando Next.js..."
exec npm run start
