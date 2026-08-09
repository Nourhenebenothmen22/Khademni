import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("Enabling PostgreSQL extensions vector and pg_trgm...");
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "vector";`);
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);
  console.log("PostgreSQL extensions enabled successfully.");
}

main()
  .catch((e) => {
    console.error("Error enabling extensions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
