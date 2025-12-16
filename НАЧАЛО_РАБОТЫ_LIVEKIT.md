# 🚀 Начало работы с LiveKit

## ⚡ Быстрый старт (5 минут)

### 1️⃣ Установить зависимости Backend

```bash
cd C:\woxly\apps\backend
npm install --legacy-peer-deps
```

### 2️⃣ Настроить .env файл

Создайте файл `C:\woxly\apps\backend\.env`:

```env
# База данных
DATABASE_URL=postgresql://woxly:woxly_password@localhost:5432/woxly?schema=public

# JWT
JWT_SECRET=ваш-секретный-ключ
JWT_REFRESH_SECRET=ваш-refresh-ключ

# Сервер
PORT=3001
FRONTEND_URL=http://localhost:3000

# LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

### 3️⃣ Запустить LiveKit сервер

```bash
cd C:\woxly\infra
docker-compose up -d livekit
```

Проверка:
```bash
docker ps | findstr livekit
```

### 4️⃣ Запустить приложение

**Backend:**
```bash
cd C:\woxly\apps\backend
npm run dev
```

**Frontend (в новом терминале):**
```bash
cd C:\woxly\apps\frontend
npm run dev
```

### 5️⃣ Открыть приложение

Откройте: http://localhost:3000

---

## ✅ Проверка работы

1. Войдите под двумя пользователями (два браузера)
2. Создайте голосовую комнату
3. Проверьте звук
4. Готово! 🎉

---

## 🐛 Проблемы?

### LiveKit не запускается
```bash
docker-compose restart livekit
docker logs woxly-livekit
```

### Нет звука
1. Проверьте разрешения микрофона в браузере
2. Откройте DevTools (F12) → Console
3. Проверьте, что `LIVEKIT_URL` правильный в .env

### Backend не запускается
Проверьте, что все переменные в `.env` заполнены.

---

## 📚 Подробная документация

- **[INSTALL_LIVEKIT.md](./INSTALL_LIVEKIT.md)** - Пошаговая установка
- **[LIVEKIT_QUICK_START.md](./LIVEKIT_QUICK_START.md)** - Быстрый старт
- **[LIVEKIT_MIGRATION.md](./LIVEKIT_MIGRATION.md)** - Полное руководство

---

## 🎯 Что дальше?

1. Протестируйте все функции звонков
2. Настройте production deployment
3. Добавьте видео звонки (опционально)

**Удачи! 🚀**
