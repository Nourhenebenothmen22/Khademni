import { prisma } from '../src/lib/prisma.js';

async function main() {
  const userCount = await prisma.user.count();
  console.log(`✅ Connected. Found ${userCount} users in the database.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Connection failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
