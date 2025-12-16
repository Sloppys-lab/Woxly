import { prisma } from '../db.js';

export async function generateWoxlyId(): Promise<string> {
  let isUnique = false;
  let woxlyId: string;

  while (!isUnique) {
    // Генерация 4 случайных цифр (1000-9999)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    woxlyId = `WX${randomNum}`;

    // Проверка уникальности
    const existing = await prisma.user.findUnique({
      where: { woxlyId },
    });

    isUnique = !existing;
  }

  return woxlyId!;
}
