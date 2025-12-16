import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Создание тестового пользователя
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'test@woxly.com' },
    update: {},
    create: {
      woxlyId: 'WX0001',
      email: 'test@woxly.com',
      username: 'TestUser',
      userTag: 'testuser',
      passwordHash,
      status: 'online',
      emailVerified: true,
    },
  });

  console.log('Seed completed:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

