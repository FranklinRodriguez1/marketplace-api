// The Prisma 7 client is generated under src/generated (JS + d.ts). tsc does not re-emit
// pre-existing JS, so we copy it next to the compiled output for the runtime image.
import { cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src', 'generated');
const dest = join(here, '..', 'dist', 'generated');

if (existsSync(src)) {
  cpSync(src, dest, { recursive: true });
  console.log(`[build] copied ${src} -> ${dest}`);
} else {
  console.warn('[build] no src/generated to copy (run `prisma generate` first)');
}
