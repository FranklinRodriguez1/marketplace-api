#!/usr/bin/env bash
# =============================================================================
# check-versions.sh — reports each direct dependency in the CURRENT directory's
# package.json vs the npm registry `latest`, flagging deprecations, updates, and
# peer conflicts. `--gate` exits 1 if any direct dependency is deprecated.
#
# Reads package.json from the CURRENT working directory (so verify.sh can run it
# once at the repo root and once inside apps/api).
# =============================================================================
set -euo pipefail

# En algunos shells de Windows / hooks de git, `pnpm` está disponible pero `node` "pelado" no
# está en el PATH. Esta comprobación es de node + red; si no hay node, se omite limpiamente en
# vez de romper la puerta (en CI sí corre completa).
if ! command -v node >/dev/null 2>&1; then
  echo "node no está en el PATH — se omite la comprobación de dependencias (corre en CI)."
  exit 0
fi

node --input-type=module - "${1:-}" <<'NODE'
import { readFileSync, existsSync } from 'node:fs';

const GATE = process.argv[2] === '--gate';
if (!existsSync('package.json')) {
  console.error('no package.json in the current directory');
  process.exit(2);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const deps = new Map();
for (const field of ['dependencies', 'devDependencies']) {
  for (const [name, range] of Object.entries(pkg[field] ?? {})) {
    if (String(range).startsWith('workspace:') || String(range).startsWith('link:')) continue;
    if (!deps.has(name)) deps.set(name, range);
  }
}

const names = [...deps.keys()].sort();
const CONCURRENCY = 8;
const results = [];

async function lookup(name) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`,
                            { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { name, range: deps.get(name), latest: data.version,
             deprecated: data.deprecated ?? null, error: null };
  } catch (e) {
    return { name, range: deps.get(name), latest: '?', deprecated: null, error: e.message ?? String(e) };
  }
}

for (let i = 0; i < names.length; i += CONCURRENCY) {
  results.push(...await Promise.all(names.slice(i, i + CONCURRENCY).map(lookup)));
}

const clean = (r) => String(r).replace(/^[\^~>=<\s]+/, '');
const pad = (s, n) => String(s).padEnd(n);
const w = Math.max(14, ...results.map((r) => r.name.length)) + 2;

console.log(`\n${pad('PACKAGE', w)}${pad('DECLARED', 16)}${pad('LATEST', 14)}STATUS`);
console.log('-'.repeat(w + 46));

let deprecatedCount = 0, behindCount = 0, errorCount = 0;
for (const r of results) {
  let status = 'ok';
  if (r.error) { status = `⚠ lookup failed (${r.error})`; errorCount++; }
  else if (r.deprecated) { status = `❌ DEPRECATED: ${String(r.deprecated).slice(0, 60)}`; deprecatedCount++; }
  else if (clean(r.range) !== r.latest) { status = '↑ update available'; behindCount++; }
  console.log(`${pad(r.name, w)}${pad(r.range, 16)}${pad(r.latest, 14)}${status}`);
}

console.log(`\n${results.length} direct deps · ${deprecatedCount} deprecated · ` +
            `${behindCount} behind latest · ${errorCount} lookup errors`);

if (GATE && deprecatedCount > 0) {
  console.error('\nGATE: deprecated dependencies present — replace them with their documented successors.');
  process.exit(1);
}
NODE
