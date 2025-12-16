import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const login = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { login },
    update: {
      passwordHash,
    },
    create: {
      login,
      passwordHash,
    },
  });

  console.log(`✅ Администратор создан/обновлен:`);
  console.log(`   Логин: ${admin.login}`);
  console.log(`   ID: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

