import { Router } from 'express';
import {
  getStats,
  getUsers,
  getUser,
  updateUser,
  banUser,
  unbanUser,
  deleteUser,
  getRooms,
  getRoom,
  deleteRoom,
  getMessages,
  deleteMessage,
  getActivityLogs,
  getAdvancedStats,
  setBadge,
} from '../controllers/admin.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';

const router = Router();

// Все админские роуты требуют админской авторизации
router.use(adminAuthMiddleware);

// Статистика
router.get('/stats', getStats);
router.get('/stats/advanced', getAdvancedStats);

// Пользователи
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.post('/users/:id/ban', banUser);
router.post('/users/:id/unban', unbanUser);
router.post('/users/:id/badge', setBadge);
router.delete('/users/:id', deleteUser);

// Комнаты
router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoom);
router.delete('/rooms/:id', deleteRoom);

// Сообщения
router.get('/messages', getMessages);
router.delete('/messages/:id', deleteMessage);

// Логи активности
router.get('/logs', getActivityLogs);

export default router;
