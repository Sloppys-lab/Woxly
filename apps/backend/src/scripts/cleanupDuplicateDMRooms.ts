import { prisma } from '../db.js';

/**
 * Скрипт для очистки дублирующихся DM комнат
 * Находит все DM комнаты между одинаковыми парами пользователей,
 * переносит сообщения в самую старую комнату и удаляет дубликаты
 */
async function cleanupDuplicateDMRooms() {
  console.log('🔍 Начинаем поиск дублирующихся DM комнат...');

  // Получаем все DM комнаты
  const dmRooms = await prisma.room.findMany({
    where: { type: 'DM' },
    include: {
      members: {
        select: { userId: true },
      },
      messages: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📊 Найдено ${dmRooms.length} DM комнат`);

  // Группируем комнаты по парам пользователей
  const roomsByPair = new Map<string, typeof dmRooms>();

  for (const room of dmRooms) {
    const memberIds = room.members.map(m => m.userId).sort((a, b) => a - b);
    if (memberIds.length !== 2) continue;
    
    const pairKey = `${memberIds[0]}-${memberIds[1]}`;
    
    if (!roomsByPair.has(pairKey)) {
      roomsByPair.set(pairKey, []);
    }
    roomsByPair.get(pairKey)!.push(room);
  }

  // Находим пары с дубликатами
  let duplicatePairs = 0;
  let roomsToDelete = 0;
  let messagesMoved = 0;

  for (const [pairKey, rooms] of roomsByPair) {
    if (rooms.length <= 1) continue;
    
    duplicatePairs++;
    console.log(`\n🔄 Пара ${pairKey}: ${rooms.length} комнат`);
    
    // Первая комната - основная (самая старая)
    const mainRoom = rooms[0];
    const duplicateRooms = rooms.slice(1);
    
    console.log(`  📌 Основная комната: #${mainRoom.id} (${mainRoom.messages.length} сообщений)`);
    
    for (const duplicateRoom of duplicateRooms) {
      console.log(`  🗑️  Дубликат: #${duplicateRoom.id} (${duplicateRoom.messages.length} сообщений)`);
      
      // Переносим сообщения в основную комнату
      if (duplicateRoom.messages.length > 0) {
        const result = await prisma.message.updateMany({
          where: { roomId: duplicateRoom.id },
          data: { roomId: mainRoom.id },
        });
        messagesMoved += result.count;
        console.log(`    ✅ Перенесено ${result.count} сообщений`);
      }
      
      // Удаляем дубликат комнаты (cascade удалит members)
      await prisma.room.delete({
        where: { id: duplicateRoom.id },
      });
      roomsToDelete++;
      console.log(`    ✅ Комната #${duplicateRoom.id} удалена`);
    }
  }

  console.log('\n📈 Итоги:');
  console.log(`  • Найдено пар с дубликатами: ${duplicatePairs}`);
  console.log(`  • Удалено комнат: ${roomsToDelete}`);
  console.log(`  • Перенесено сообщений: ${messagesMoved}`);
  console.log('✅ Очистка завершена!');
}

// Запуск
cleanupDuplicateDMRooms()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
