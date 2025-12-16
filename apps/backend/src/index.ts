import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import friendsRoutes from './routes/friends.js';
import roomsRoutes from './routes/rooms.js';
import messagesRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import adminAuthRoutes from './routes/adminAuth.js';
import { setupSocketIO } from './socket/index.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
// Разрешаем несколько origins для CORS (HTTP и HTTPS)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://woxly.ru',
  'https://www.woxly.ru',
  'http://woxly.ru',
  'http://www.woxly.ru',
  'http://localhost:3000',
  'https://localhost:3000',
];

export const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Разрешаем запросы без origin (например, мобильные приложения или Postman)
      if (!origin) return callback(null, true);
      
      // Проверяем, есть ли origin в списке разрешенных
      if (allowedOrigins.some(allowed => origin.includes(allowed.replace(/^https?:\/\//, '')))) {
        callback(null, true);
      } else {
        // Для разработки разрешаем все origins
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
  },
  // Настройки для работы через nginx прокси
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, мобильные приложения или Postman)
    if (!origin) return callback(null, true);
    
    // Проверяем, есть ли origin в списке разрешенных
    if (allowedOrigins.some(allowed => origin.includes(allowed.replace(/^https?:\/\//, '')))) {
      callback(null, true);
    } else {
      // Для разработки разрешаем все origins
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, false);
      }
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование всех запросов для отладки
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    query: req.query,
    params: req.params,
    hasAuth: !!req.headers.authorization,
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/users', authMiddleware, (req, res, next) => {
  console.log('Users router middleware called', { path: req.path, method: req.method, originalUrl: req.originalUrl });
  next();
}, usersRoutes);
app.use('/api/friends', authMiddleware, (req, res, next) => {
  console.log('Friends router middleware called', { path: req.path, method: req.method, originalUrl: req.originalUrl });
  next();
}, friendsRoutes);
app.use('/api/rooms', authMiddleware, roomsRoutes);
app.use('/api/messages', authMiddleware, messagesRoutes);
app.use('/api/admin', adminRoutes);

// Health check (должен быть перед другими маршрутами)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler для API (должен быть ПОСЛЕ всех маршрутов)
app.use('/api/*', (req, res) => {
  console.error(`[404] Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

// Setup Socket.IO
setupSocketIO(io);

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Слушаем на всех интерфейсах

httpServer.listen({
  port: PORT,
  host: HOST,
}, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };

