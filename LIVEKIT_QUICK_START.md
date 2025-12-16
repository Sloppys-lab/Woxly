# ⚡ LiveKit - Быстрый старт

## 🚀 Запуск за 5 минут

### 1. Запустить LiveKit сервер

```bash
cd infra
docker-compose up -d livekit
```

### 2. Установить зависимости backend

```bash
cd apps/backend
npm install
```

### 3. Добавить переменные окружения

Создайте файл `apps/backend/.env` (если еще нет):

```env
# Database
DATABASE_URL=postgresql://woxly:woxly_password@localhost:5432/woxly?schema=public

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

### 4. Запустить приложение

```bash
# Backend
cd apps/backend
npm run dev

# Frontend (в другом терминале)
cd apps/frontend
npm run dev
```

### 5. Тест

1. Откройте http://localhost:3000
2. Зарегистрируйтесь / войдите
3. Создайте голосовую комнату или позвоните другу
4. Готово! 🎉

---

## 🔧 Использование в коде

### Импорт нового компонента

```typescript
import CallModalLiveKit from './components/CallModal.LiveKit';

<CallModalLiveKit
  open={isCallOpen}
  onClose={() => setIsCallOpen(false)}
  groupRoom={currentRoom}
  otherUser={friend}
/>
```

### Получение токена

```typescript
const response = await axios.post(
  `${API_URL}/rooms/${roomId}/livekit-token`,
  {},
  { headers: { Authorization: `Bearer ${token}` } }
);

const { token: livekitToken, url } = response.data;
```

---

## 📝 Что дальше?

- Прочитайте [LIVEKIT_MIGRATION.md](./LIVEKIT_MIGRATION.md) для подробностей
- Настройте production deployment
- Протестируйте на мобильных устройствах

---

## ❓ Проблемы?

### LiveKit не запускается

```bash
# Проверить статус
docker ps | grep livekit

# Посмотреть логи
docker logs woxly-livekit

# Перезапустить
docker-compose restart livekit
```

### Нет звука

1. Проверьте разрешения микрофона в браузере
2. Откройте DevTools → Console и ищите ошибки
3. Проверьте, что `LIVEKIT_URL` правильный

### Ошибка "API credentials not configured"

Добавьте в `.env`:
```env
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

---

## 🎯 Готово!

Теперь у вас работает LiveKit! 🚀
