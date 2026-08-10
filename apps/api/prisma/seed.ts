import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { type Pricing, denormalizePricing } from '@cerca/contract';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const LISTING_COUNT = Number(process.env.SEED_LISTINGS ?? 2000);
const SEED_PASSWORD = 'Password123!';

const CATEGORY_NAMES = [
  'Plomería', 'Electricidad', 'Clases de guitarra', 'Clases de inglés', 'Limpieza del hogar',
  'Jardinería', 'Pintura', 'Carpintería', 'Cerrajería', 'Mudanzas',
  'Fotografía', 'Diseño gráfico', 'Peluquería', 'Manicure', 'Masajes',
  'Entrenamiento personal', 'Yoga', 'Nutrición', 'Reparación de PC', 'Redes y wifi',
  'Reparación de celulares', 'Aire acondicionado', 'Fumigación', 'Niñera', 'Cuidado de adultos',
  'Paseo de perros', 'Veterinaria a domicilio', 'Catering', 'Repostería', 'Bartender',
  'DJ para eventos', 'Decoración', 'Costura', 'Tapicería', 'Vidriería',
  'Soldadura', 'Instalación de pisos', 'Impermeabilización', 'Clases de matemáticas', 'Contabilidad',
];

const CITIES = [
  { lat: 4.711, lng: -74.0721 }, // Bogotá
  { lat: 6.2442, lng: -75.5812 }, // Medellín
  { lat: 3.4516, lng: -76.532 }, // Cali
  { lat: 10.9685, lng: -74.7813 }, // Barranquilla
  { lat: 10.391, lng: -75.4794 }, // Cartagena
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomPricing(): Pricing {
  const r = Math.random();
  if (r < 0.5) return { model: 'fixed', price: { amountMinor: (10 + Math.floor(Math.random() * 90)) * 1000, currency: 'COP' } };
  if (r < 0.8)
    return {
      model: 'hourly',
      hourlyRate: { amountMinor: (15 + Math.floor(Math.random() * 50)) * 1000, currency: 'COP' },
      minimumHours: 1 + Math.floor(Math.random() * 3),
    };
  return Math.random() < 0.5 ? { model: 'quote', startingFrom: { amountMinor: 50_000, currency: 'COP' } } : { model: 'quote' };
}

async function main(): Promise<void> {
  console.log('Resetting data...');
  await prisma.$executeRawUnsafe(
    'TRUNCATE "RefreshToken","AuditEvent","Report","Favorite","Review","Booking","ListingPhoto","Listing","Category","User" RESTART IDENTITY CASCADE',
  );

  console.log('Seeding categories...');
  const categories = CATEGORY_NAMES.map((name) => ({
    id: randomUUID(),
    slug: name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''),
    name,
  }));
  await prisma.category.createMany({ data: categories });

  console.log('Seeding users...');
  const passwordHash = await argon2.hash(SEED_PASSWORD, { type: argon2.argon2id });
  const named = [
    { email: 'customer@cerca.app', displayName: 'Camila Cliente', capacities: ['customer'] as const, platformRole: 'user' as const },
    { email: 'provider@cerca.app', displayName: 'Marta Multi', capacities: ['customer', 'provider'] as const, platformRole: 'user' as const },
    { email: 'moderator@cerca.app', displayName: 'Mateo Moderador', capacities: ['customer'] as const, platformRole: 'moderator' as const },
    { email: 'admin@cerca.app', displayName: 'Ana Admin', capacities: ['customer', 'provider'] as const, platformRole: 'admin' as const },
  ];
  const namedIds: Record<string, string> = {};
  for (const u of named) {
    const id = randomUUID();
    namedIds[u.email] = id;
    await prisma.user.create({
      data: { id, email: u.email, passwordHash, displayName: u.displayName, capacities: [...u.capacities], platformRole: u.platformRole },
    });
  }
  // A handful of extra providers to own the bulk listings.
  const providerIds = [namedIds['provider@cerca.app'] as string];
  for (let i = 0; i < 9; i += 1) {
    const id = randomUUID();
    providerIds.push(id);
    await prisma.user.create({
      data: { id, email: `provider${i}@cerca.app`, passwordHash, displayName: `Proveedor ${i}`, capacities: ['provider'], platformRole: 'user' },
    });
  }

  console.log(`Seeding ${LISTING_COUNT} listings...`);
  const now = new Date();
  const rows = Array.from({ length: LISTING_COUNT }, () => {
    const category = pick(categories);
    const city = pick(CITIES);
    const pricing = randomPricing();
    const denorm = denormalizePricing(pricing);
    return {
      id: randomUUID(),
      ownerId: pick(providerIds),
      categoryId: category.id,
      title: `${category.name} — servicio profesional`,
      description: `Servicio de ${category.name.toLowerCase()} con experiencia y garantía.`,
      pricingJson: JSON.stringify(pricing),
      priceMinorFrom: denorm.priceMinorFrom,
      currency: denorm.currency,
      lat: city.lat + (Math.random() - 0.5) * 0.3,
      lng: city.lng + (Math.random() - 0.5) * 0.3,
    };
  });

  const CHUNK = 1000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const values = chunk.map(
      (l) =>
        Prisma.sql`(${l.id}::uuid, ${l.ownerId}::uuid, ${l.categoryId}::uuid, ${l.title}, ${l.description}, ${l.pricingJson}::jsonb, ${l.priceMinorFrom}, ${l.currency}, 'published'::"ListingStatusKind", ${now}, 0, 0, ST_SetSRID(ST_MakePoint(${l.lng}, ${l.lat}), 4326)::geography, ${now}, ${now})`,
    );
    await prisma.$executeRaw(
      Prisma.sql`INSERT INTO "Listing" ("id","ownerId","categoryId","title","description","pricing","priceMinorFrom","currency","statusKind","publishedAt","ratingAvg","ratingCount","location","createdAt","updatedAt") VALUES ${Prisma.join(values)}`,
    );
  }

  console.log('\nSeed complete.');
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Listings:   ${LISTING_COUNT}`);
  console.log('  Test users (password for all: ' + SEED_PASSWORD + '):');
  console.log('    customer@cerca.app   (customer)');
  console.log('    provider@cerca.app   (customer + provider)');
  console.log('    moderator@cerca.app  (moderator)');
  console.log('    admin@cerca.app      (admin)');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
