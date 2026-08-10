#!/usr/bin/env bash
# =============================================================================
# setup.sh — Deja el proyecto LISTO para desarrollar con un solo comando.
# install → apps/api/.env (con JWT_SECRET) → Docker (db+redis) → migraciones → seed.
# Es idempotente: puedes correrlo las veces que quieras. Al terminar: pnpm dev
# Úsalo con: pnpm setup
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

BLUE='\033[1;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; NC='\033[0m'
step() { printf '\n%b==> %s%b\n' "$BLUE" "$1" "$NC"; }

# 0) Docker tiene que estar corriendo: Postgres+PostGIS y Redis van en contenedores.
if ! docker info >/dev/null 2>&1; then
  printf '%b✖ Docker no está corriendo. Abre Docker Desktop e inténtalo de nuevo.%b\n' "$RED" "$NC"
  exit 1
fi

# 1) Dependencias. El postinstall genera el cliente de Prisma y el prepare compila @cerca/contract.
step "[1/5] Instalando dependencias (compila @cerca/contract y genera el cliente de Prisma)"
pnpm install

# 2) apps/api/.env. Se crea si no existe; si existe pero el JWT_SECRET está vacío, lo rellena;
#    si ya tiene un secreto válido, no se toca. El secreto se genera en la máquina, nunca se sube.
step "[2/5] Preparando apps/api/.env"
gen_env() { # $1 = archivo origen a leer (siempre escribe apps/api/.env)
  node -e '
    const fs=require("fs"), crypto=require("crypto");
    let s=fs.readFileSync(process.argv[1],"utf8");
    if(!/^JWT_SECRET=.+/m.test(s)){
      s=s.replace(/^JWT_SECRET=.*$/m,"JWT_SECRET="+crypto.randomBytes(48).toString("base64"));
    }
    fs.writeFileSync("apps/api/.env",s);
  ' "$1"
}
if [ -f apps/api/.env ]; then
  gen_env apps/api/.env
  printf '%b• apps/api/.env ya existía — secreto verificado%b\n' "$YELLOW" "$NC"
else
  gen_env .env.example
  printf '%b✔ apps/api/.env creado con un JWT_SECRET nuevo%b\n' "$GREEN" "$NC"
fi

# 3) Infra: Postgres+PostGIS y Redis (los otros perfiles/servicios no hacen falta para desarrollar).
step "[3/5] Levantando Postgres+PostGIS y Redis"
docker compose up -d db redis

step "Esperando a que Postgres acepte conexiones"
for _ in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U cerca -d cerca >/dev/null 2>&1; then break; fi
  sleep 1
done

# 4) Migraciones — paso aparte, nunca al arrancar la app.
step "[4/5] Aplicando migraciones"
pnpm --filter @cerca/api prisma migrate deploy

# 5) Seed — el propio script hace TRUNCATE primero, así que es seguro repetirlo.
step "[5/5] Sembrando datos de prueba (40 categorías, 2.000 anuncios, usuarios de prueba)"
pnpm --filter @cerca/api prisma db seed

printf '\n%b✔ Todo listo.%b  Arranca la API con:  %bpnpm dev%b   →  http://localhost:3333\n' "$GREEN" "$NC" "$BLUE" "$NC"
printf '   Swagger:  http://localhost:3333/docs\n'
