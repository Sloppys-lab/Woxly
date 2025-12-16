# WOXLY - Голосовой мессенджер

Полнофункциональный аналог Discord с голосовой связью, чатами, друзьями и комнатами.

## 🚀 Технологический стек

### Frontend
- React + TypeScript
- Vite
- TailwindCSS
- React Router
- Zustand
- Socket.IO Client
- **LiveKit Client** (голосовые звонки)

### Backend
- Node.js + Express
- Socket.IO
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcrypt
- Multer (загрузка файлов)
- Nodemailer (email)

### Infrastructure
- Docker + docker-compose
- Nginx (reverse proxy)
- **LiveKit Server** (SFU для голосовых звонков)
- Coturn (TURN server, опционально)

## 📁 Структура проекта

```
woxly/
├── apps/
│   ├── frontend/        # React приложение
│   └── backend/         # Express сервер
├── packages/
│   ├── ui/              # UI компоненты
│   └── shared/          # Общие типы
├── prisma/
│   └── schema.prisma    # Схема базы данных
├── infra/
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── turnserver.conf
└── layout_mockups/      # Макеты интерфейса
```

## 🛠️ Установка и запуск

### Локальная разработка

1. **Клонировать репозиторий**
```bash
git clone <repo-url>
cd woxly
```

2. **Установить зависимости**
```bash
npm install
```

3. **Настроить базу данных**
```bash
cd apps/backend
cp .env.example .env
# Отредактировать .env файл
```

4. **Запустить миграции**
```bash
npm run db:migrate
npm run db:generate
```

5. **Запустить backend**
```bash
npm run dev:backend
```

6. **Запустить frontend**
```bash
npm run dev
```

### Docker

```bash
cd infra
docker-compose up -d
```

## 📝 API Endpoints

### Auth
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/verify-email` - Подтверждение email
- `POST /api/auth/refresh` - Обновление токена

### Users
- `GET /api/users/me` - Получить профиль
- `PUT /api/users/me` - Обновить профиль
- `POST /api/users/me/avatar` - Загрузить аватар
- `PUT /api/users/me/status` - Изменить статус

### Friends
- `GET /api/friends` - Список друзей
- `GET /api/friends/search` - Поиск пользователей
- `POST /api/friends/add` - Добавить друга
- `DELETE /api/friends/:friendId` - Удалить друга

### Rooms
- `GET /api/rooms` - Список комнат
- `POST /api/rooms` - Создать комнату
- `GET /api/rooms/:id` - Получить комнату
- `POST /api/rooms/:id/join` - Присоединиться
- `POST /api/rooms/:id/leave` - Выйти

### Messages
- `GET /api/messages?roomId=:id` - История сообщений
- `POST /api/messages` - Отправить сообщение
- `PUT /api/messages/:id` - Редактировать
- `DELETE /api/messages/:id` - Удалить

## 🎨 Дизайн

Проект полностью соответствует макетам из папки `layout_mockups` и использует:
- Цвета из `COLOR_PALETTE.md`
- Правила из `DESIGN_GUIDE.md`
- Логику из `How_it_works.md`

## 🎙️ Голосовые звонки (LiveKit)

Проект использует **LiveKit** для голосовых звонков вместо чистого WebRTC.

### Преимущества LiveKit:
- ✅ Поддержка 100+ участников в комнате
- ✅ Автоматическая оптимизация качества
- ✅ Надежное переподключение
- ✅ Профессиональное качество звука
- ✅ Простая интеграция

### Быстрый старт:

```bash
# 1. Запустить LiveKit сервер
cd infra
docker-compose up -d livekit

# 2. Добавить в apps/backend/.env
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# 3. Запустить приложение
npm run dev:backend
npm run dev
```

📖 **Подробная документация:** [LIVEKIT_QUICK_START.md](./LIVEKIT_QUICK_START.md)

## 📄 Лицензия

MIT

