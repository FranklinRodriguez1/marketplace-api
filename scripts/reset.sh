#!/usr/bin/env bash
# =============================================================================
# reset.sh — Reinicia TODO desde cero.
# Borra los datos de Postgres, Redis y MinIO (volúmenes de Docker), limpia los
# artefactos de build, reconstruye, re-aplica migraciones y re-siembra.
# Deja el entorno como recién clonado. Úsalo con: pnpm reset
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[1;34m'; NC='\033[0m'
step() { printf '\n%b==> %s%b\n' "$BLUE" "$1" "$NC"; }

if ! docker info >/dev/null 2>&1; then
  printf '%b✖ Docker no está corriendo. Abre Docker Desktop e inténtalo de nuevo.%b\n' "$RED" "$NC"
  exit 1
fi

step "Borrando contenedores y volúmenes (esto elimina TODA la data: Postgres, Redis, MinIO)"
docker compose down -v --remove-orphans || true

step "Limpiando artefactos de build"
rm -rf apps/api/dist apps/api/src/generated packages/contract/dist
rm -f apps/api/*.tsbuildinfo

step "Reconstruyendo @cerca/contract y el cliente de Prisma"
pnpm --filter @cerca/contract build
pnpm --filter @cerca/api exec prisma generate

step "Levantando Postgres+PostGIS y Redis limpios"
docker compose up -d db redis

step "Esperando a que Postgres acepte conexiones"
for _ in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U cerca -d cerca >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

step "Aplicando migraciones (paso aparte, nunca al arrancar la app)"
pnpm --filter @cerca/api prisma migrate deploy

step "Sembrando datos de prueba (40 categorías, 2.000 anuncios, usuarios de prueba)"
pnpm --filter @cerca/api prisma db seed

printf '\n%b✔ Entorno reiniciado desde cero.%b\n' "$GREEN" "$NC"
printf '  Arranca la API con:  %bpnpm dev%b   →  http://localhost:3333\n' "$BLUE" "$NC"
