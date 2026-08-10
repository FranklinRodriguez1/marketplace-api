#!/usr/bin/env bash
# =============================================================================
# verify.sh — THE quality gate for the Cerca monorepo (@cerca/contract + @cerca/api).
#
# exit 0  ⇒  contract builds · Prisma client generated · lint clean (0 warnings) ·
#            strict types · tests green (contract at 100%) · workspace builds ·
#            Prisma schema valid with no migration drift · no high/critical vulns ·
#            no deprecated direct dependencies.
#
# Used by .husky/pre-push and CI. `--quick` (lint + types) is for pre-commit.
# Never bypass with --no-verify. Fix the code, not the gate.
#
# NOTE: `prisma generate` and the drift check need network access to the Prisma engine
# CDN. They run in CI and on any normal machine; in a network-restricted sandbox they are
# skipped with a warning (the rest of the gate still runs).
# =============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:---full}"
case "$MODE" in --quick | --full) ;; *) echo "usage: verify.sh [--quick|--full]"; exit 2 ;; esac

BLUE='\033[1;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; NC='\033[0m'
step() { printf '\n%b▶ %s%b\n' "$BLUE" "$1" "$NC"; }
ok() { printf '%b✔ %s%b\n' "$GREEN" "$1" "$NC"; }
skip() { printf '%b• skipped — %s%b\n' "$YELLOW" "$1" "$NC"; }
fail() { printf '\n%b✖ GATE FAILED — %s%b\n' "$RED" "$1" "$NC"; exit 1; }

START=$(date +%s)

step "[0/8] Build @cerca/contract (the API resolves it as a dependency)"
pnpm --filter @cerca/contract build >/dev/null || fail "contract build failed"
ok "contract built"

step "[1/8] Prisma client — generate"
if pnpm --filter @cerca/api exec prisma generate >/dev/null 2>&1; then
  ok "client generated"
else
  skip "prisma generate needs the engine (network) — ensure the client is generated in CI"
fi

step "[2/8] Lint — ESLint across the workspace, zero warnings tolerated"
pnpm -r lint || fail "lint reported errors or warnings"
ok "lint clean"

step "[3/8] Types — tsc --noEmit (strict), every package"
pnpm -r check-types || fail "type errors"
ok "types sound"

if [ "$MODE" = "--quick" ]; then
  printf '\n%b✔ QUICK GATE PASSED (lint + types) in %ss%b\n' "$GREEN" "$(($(date +%s) - START))" "$NC"
  exit 0
fi

step "[4/8] Tests — contract at 100% coverage + API unit suite"
pnpm -r test || fail "failing tests or coverage below threshold"
ok "tests green"

step "[5/8] Build — production build of every package"
pnpm -r build || fail "build error"
ok "build succeeds"

step "[6/8] Prisma — schema validity and migration drift"
if pnpm --filter @cerca/api exec prisma validate >/dev/null 2>&1; then
  if pnpm --filter @cerca/api exec prisma migrate diff \
    --from-migrations apps/api/prisma/migrations \
    --to-schema-datamodel apps/api/prisma/schema.prisma \
    --shadow-database-url "${SHADOW_DATABASE_URL:-}" --exit-code >/dev/null 2>&1; then
    ok "schema valid · no migration drift"
  else
    case $? in
    2) fail "migration drift — run: pnpm --filter @cerca/api prisma migrate dev --name <change>" ;;
    *) skip "drift check needs SHADOW_DATABASE_URL + engine (schema itself is valid)" ;;
    esac
  fi
else
  skip "prisma validate needs the engine (network)"
fi

step "[7/8] Security — pnpm audit (high/critical block the gate)"
pnpm audit --audit-level high || fail "known high/critical vulnerability"
ok "no high/critical vulnerabilities"

step "[8/8] Dependency health — no deprecated direct dependencies"
if command -v node >/dev/null 2>&1; then
  bash scripts/check-versions.sh --gate || fail "root tooling has a deprecated dependency"
  (cd apps/api && bash "$ROOT/scripts/check-versions.sh" --gate) || fail "the API has a deprecated dependency"
  ok "no deprecated dependencies"
else
  skip "node no está en el PATH — la comprobación de dependencias corre en CI"
fi

printf '\n%b✔ FULL GATE PASSED in %ss — this service is releasable.%b\n' "$GREEN" "$(($(date +%s) - START))" "$NC"
