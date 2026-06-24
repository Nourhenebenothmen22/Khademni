import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL ?? '';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      posts: {
        create: [
          { title: 'Hello World', content: 'My first post!', published: true },
          { title: 'Second Post', content: 'Another day, another post.' },
        ],
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      posts: {
        create: [{ title: 'Prisma is awesome', content: 'Type-safe database access.', published: true }],
      },
    },
  });

  console.log(`Seeded ${[alice, bob].length} users with posts.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
