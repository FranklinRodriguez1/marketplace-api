# Cerca — API

**Marketplace de servicios locales · backend, base de datos y despliegue dockerizado.**

API REST versionada (`/v1`) construida con **NestJS 11 + Prisma 7 + PostgreSQL/PostGIS + Redis**,
siguiendo Clean Architecture y SOLID. El servidor es la **única autoridad**: la app móvil pinta,
pero cada permiso se comprueba aquí, en cada petición, contra el recurso — no solo contra el rol.

Este repo es un **monorepo pnpm** con dos piezas:

- **`packages/contract`** — `@cerca/contract`: tipos, schemas de Zod, la **matriz de permisos** y
  las **políticas puras** (`canReviewBooking`, `canEditListing`, `canChangePrice`). Un solo sitio
  define la regla; el backend la aplica y la app móvil importaría exactamente el mismo archivo.
- **`apps/api`** — `@cerca/api`: la API NestJS. Las dependencias apuntan hacia dentro; los
  frameworks y proveedores se enchufan por los bordes a través de puertos.

---

## Estado

Todo el núcleo funcional está implementado, corre de extremo a extremo y está probado:

- **51 tests** de dominio en `@cerca/contract` con **100 % de cobertura** (la política estrella y
  sus cuatro motivos, la matriz de permisos completa, dinero, pricing).
- **12 tests** unitarios de casos de uso con *fakes* (write-review, update-listing/BOLA).
- **8 tests e2e** que arrancan la app real contra Postgres + Redis reales.
- La puerta completa `bash scripts/verify.sh --full` sale **verde**: lint sin avisos, tipos
  estrictos, tests, build, esquema válido, `pnpm audit` sin vulnerabilidades y sin dependencias
  deprecadas.

Fuera del núcleo (declarado): subida de fotos con MinIO/URL prefirmada, worker BullMQ (blurhash),
chat en tiempo real y pagos. El modelo de datos ya reserva `ListingPhoto`/`Favorite` para cuando
se retomen.

---

## El stack, y por qué

| Concern | Elección | Por qué esta |
|---|---|---|
| Runtime | **Node.js 22 LTS** | Fijado en `engines`, `.nvmrc` y la imagen base |
| Framework | **NestJS 11** (Express 5) | DI + módulos hacen ergonómica la Clean Architecture |
| ORM | **Prisma 7** (`prisma-client` + `@prisma/adapter-pg`) | Consultas tipadas; v7 es Rust-free/ESM |
| Base de datos | **PostgreSQL 16 + PostGIS 3.4** | Transacciones, JSONB, índices GiST, integridad referencial |
| Geoespacial | **PostGIS** (`geography`, `ST_DWithin`, GiST) | La consulta dominante es "cerca de mí" |
| Contratos | **Zod + `nestjs-zod`** | Un schema valida, tipa y genera OpenAPI |
| Caché / idempotencia | **Redis** (`ioredis`) detrás de `CachePort` | Cache-aside con TTL, claves de idempotencia |
| AuthN | **`@nestjs/jwt`** + rotación de refresh | Autocontenida, sin servicio externo, ideal para desplegar gratis |
| AuthZ | **CASL** detrás de `PolicyGuard` + políticas puras | A nivel de objeto, no solo de rol (BOLA es la vuln nº 1) |
| Contraseñas | **Argon2id** | Memory-hard; jamás un hash rápido |
| Observabilidad | **pino + nestjs-cls + Terminus** | Logs con ID de correlación, sondas de salud |
| Pruebas | **Vitest + Supertest** | Dominio al 100 %, e2e sobre la app real |
| Calidad | **Husky → `scripts/verify.sh`**, replicado en CI | Local y CI no pueden divergir |
| Entrega | **Docker multi-stage (no-root)**, migraciones como paso aparte | `docker compose` reconstruye todo |

**Por qué `@nestjs/jwt` y no Better-Auth:** el spec pedía elegir una vez y justificarlo. JWT con
rotación de refresh es *stateless*, no depende de un servicio ni de tablas externas, y hace el
despliegue en un tier gratuito trivial. El coste — construir la rotación y la detección de reuso —
lo pagamos una vez y queda en `modules/auth`.

---

## Las cuatro capas de autorización

Todo permiso se descompone en cuatro capas, y las cuatro son seguridad que el servidor hace cumplir:

1. **CAPACIDAD** — `can(actor, 'listing:update')`, resuelta por el `PolicyGuard` de CASL desde la
   matriz compartida, sin cargar nada.
2. **PROPIEDAD** — `listing.ownerId === actor.id`.
3. **RELACIÓN** — el actor participa en la reserva.
4. **ESTADO/TIEMPO** — `status === completed`, ventana de 30 días.

Las capas 2–4 solo se pueden evaluar con el recurso cargado, y viven en las **políticas puras** del
paquete compartido. El caso de uso carga el recurso y llama a la política; si devuelve
`{ ok: false, reason }`, se lanza un error de dominio que el filtro traduce a `403/409 problem+json`
con ese mismo `reason`.

La cuenta tiene **capacidades** (`customer`, `provider` — puede tener las dos) y, por separado, un
**rol de plataforma** (`user`, `moderator`, `admin`). Marta publica clases de guitarra y contrata un
fontanero: es las dos cosas. Por eso `can()` hace OR de capacidad y rol, y nunca existe una columna
`role: 'customer' | 'provider'`.

### La función estrella

`canReviewBooking(actor, booking, now)` vive en `@cerca/contract` y devuelve un **motivo**, no un
booleano. No se puede reseñar si no fuiste tú quien contrató (`not_your_booking`), si la reserva no
está completada (`not_completed`), si ya la reseñaste (`already_reviewed`) o si pasaron más de 30
días (`window_closed`). `now` es un parámetro: el test de "ventana cerrada" pasa una fecha, no simula
relojes. La unicidad la garantiza **también la base de datos** (`Review.bookingId @unique`, dentro de
una transacción), así que dos peticiones concurrentes no crean dos reseñas.

---

## Decisiones justificadas

- **El dinero son enteros.** `Money = { amountMinor, currency }`. `0.1 + 0.2 !== 0.3`, y dividir
  entre 100 está mal en general (el peso colombiano no tiene decimales, el dinar tiene tres). El
  servidor nunca formatea ni divide; el cliente renderiza.
- **`pricing` es JSONB validado por Zod y además denormalizado.** Se guarda `priceMinorFrom` +
  `currency` en columnas, en la **misma transacción** que el JSONB, para poder filtrar y ordenar por
  precio sin abrir el JSON.
- **La búsqueda usa el índice GiST.** `ST_DWithin` descarta lo que está fuera del radio antes de
  calcular distancias (`EXPLAIN` lo confirma: *Bitmap Index Scan on `listing_location_gist`*). La
  paginación es **keyset** sobre `(distance, id)`, nunca `OFFSET`.
- **La auditoría guarda la capacidad del momento.** `AuditEvent.capacitySnapshot` es un *snapshot*:
  si mañana Marta deja de ser proveedora, el registro sigue diciendo que actuó siéndolo.
- **Refresh con rotación y detección de reuso.** Presentar un token ya consumido revoca toda la
  familia — así se detecta el robo.
- **Los estados son uniones discriminadas** en el dominio y `enum + columnas` en Postgres, con el
  repositorio reconstruyendo la unión. Así "anuncios publicados" es una consulta indexada.

---

## Estructura

```
packages/contract/          # @cerca/contract — tipos, schemas, matriz y políticas puras
apps/api/
├── src/
│   ├── main.ts · configure-app.ts · openapi.ts
│   ├── config/env.ts            # env validado por Zod ANTES de arrancar Nest
│   ├── kernel/                  # DomainError, cursor, ports (Clock, Id, Cache, Transaction)
│   ├── shared/                  # database/, cache/, auth/ (guards, CASL), http/ (filtro, idempotencia)
│   ├── modules/<feature>/       # auth, listing, booking, review, report, category, audit
│   │   ├── domain/ application/ infrastructure/ presentation/
│   │   └── <feature>.module.ts  # el ÚNICO archivo que enlaza puertos → implementaciones
│   ├── health/                  # /health/live · /health/ready (Terminus)
│   └── generated/prisma/        # cliente de Prisma 7 (gitignored)
├── prisma/schema.prisma · prisma/migrations/ · prisma/seed.ts
└── test/e2e/
```

---

## Cómo correrlo en local

Requisitos: **Node 22**, **pnpm 10**, **Docker** (para Postgres+PostGIS y Redis, que corren en contenedores).

Con Docker abierto, son **dos comandos**:

```bash
pnpm setup    # instala, crea apps/api/.env con un JWT_SECRET, levanta Postgres+Redis, migra y siembra
pnpm dev      # arranca la API en http://localhost:3333
```

`pnpm setup` es **idempotente** (hace `TRUNCATE` antes de sembrar), así que puedes repetirlo sin miedo.
Si prefieres verlo paso a paso, o hacerlo a mano, es exactamente esto:

```bash
pnpm install                                   # instala, compila @cerca/contract y genera el cliente de Prisma
cp .env.example apps/api/.env                  # y pon un JWT_SECRET (openssl rand -base64 48)
#   Si @cerca/contract no aparece compilado: pnpm contract:build

docker compose up -d db redis                  # Postgres+PostGIS + Redis
pnpm --filter @cerca/api prisma migrate deploy # crea el esquema (paso aparte, nunca al arrancar)
pnpm --filter @cerca/api prisma db seed        # 40 categorías, 2.000 anuncios, usuarios de prueba

pnpm dev                                        # arranca la API en http://localhost:3333
```

- **OpenAPI / Swagger UI:** `http://localhost:3333/docs`
- **Salud:** `http://localhost:3333/health/live` y `/health/ready`

Usuarios de prueba (contraseña para todos: `Password123!`):

| email | capacidades / rol |
|---|---|
| `customer@cerca.app` | customer |
| `provider@cerca.app` | customer + provider |
| `moderator@cerca.app` | moderator |
| `admin@cerca.app` | admin |

Ejemplo — buscar cerca de Medellín y ver el orden por distancia:

```bash
curl "http://localhost:3333/v1/listings?lat=6.2442&lng=-75.5812&radiusKm=5&limit=5"
```

---

## Reiniciar desde cero

Cuando quieras volver a un estado limpio — como recién clonado — hay dos niveles:

```bash
pnpm reset      # NUCLEAR: borra los volúmenes de Docker (Postgres, Redis, MinIO → toda la data),
                # limpia los artefactos de build, reconstruye @cerca/contract y el cliente de Prisma,
                # levanta la base limpia, re-aplica migraciones y vuelve a sembrar. Necesita Docker corriendo.

pnpm db:reset   # SOLO BD: `prisma migrate reset --force` — tira el esquema, re-aplica todas las
                # migraciones y re-siembra. No toca Redis, MinIO ni los artefactos de build.
```

Usa `pnpm reset` cuando algo quedó en un estado raro (volúmenes corruptos, datos de caché viejos) o
simplemente quieras empezar de cero. Usa `pnpm db:reset` para el caso común de "quiero la base de datos
fresca con los datos de seed" sin tocar el resto. Al terminar, arranca con `pnpm dev`.

---

## Pruebas y la puerta de calidad

```bash
pnpm --filter @cerca/contract test   # dominio: 51 tests, 100 % de cobertura
pnpm --filter @cerca/api test        # casos de uso con fakes
pnpm --filter @cerca/api test:e2e    # e2e contra Postgres + Redis reales
bash scripts/verify.sh --full        # LA puerta: lint · tipos · tests · build · prisma · audit
```

`bash scripts/verify.sh --full` sale 0 solo si todo está verde. El mismo archivo corre en CI
(`.github/workflows/ci.yml`), para que local y CI no puedan divergir. `--no-verify` está prohibido.

---

## Nota sobre Prisma 7 y el motor

Prisma 7 es Rust-free: la **app en ejecución** (y el seed, y los tests e2e) usan el *query compiler* +
`@prisma/adapter-pg` y **no necesitan ningún binario**. Solo el CLI de migraciones
(`prisma migrate`) descarga el *schema-engine* desde `binaries.prisma.sh`, que requiere red — algo
que cualquier máquina normal, CI y Railway tienen. Las migraciones se aplican como **paso aparte y
con puerta**, jamás al arrancar la app.

---

## Despliegue

El paso a paso completo — **Railway** (nube) y **Docker Compose** (local, 100 % gratis) — está en
[`DEPLOY.md`](./DEPLOY.md).
