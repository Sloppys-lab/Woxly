# 🚀 Установка LiveKit - Пошаговая инструкция

## ⚠️ Важно!

Из-за проблем с установкой `livekit-server-sdk` через npm в корневой папке, следуйте этим инструкциям:

---

## 📦 Шаг 1: Установка зависимостей

### Backend

```bash
cd C:\woxly\apps\backend
```

Откройте `package.json` и убедитесь, что есть строка:
```json
"livekit-server-sdk": "^2.0.0"
```

Если её нет, добавьте вручную в секцию `dependencies`.

Затем установите:
```bash
npm install --legacy-peer-deps
```

Или если не работает, установите напрямую:
```bash
npm install livekit-server-sdk@latest --save --legacy-peer-deps
```

### Frontend

```bash
cd C:\woxly\apps\frontend
npm install
```

Зависимость `livekit-client` уже установлена! ✅

---

## 🐳 Шаг 2: Запуск LiveKit сервера

### Вариант A: Docker (Рекомендуется)

```bash
cd C:\woxly\infra
docker-compose up -d livekit
```

Проверка:
```bash
docker ps | findstr livekit
docker logs woxly-livekit
```

### Вариант B: Локально (Windows)

1. Скачайте LiveKit сервер:
```powershell
# Создайте папку для LiveKit
mkdir C:\livekit
cd C:\livekit

# Скачайте последнюю версию
Invoke-WebRequest -Uri "https://github.com/livekit/livekit/releases/latest/download/livekit-server-windows-amd64.exe" -OutFile "livekit-server.exe"
```

2. Скопируйте конфигурацию:
```powershell
copy C:\woxly\infra\livekit.yaml C:\livekit\livekit.yaml
```

3. Запустите сервер:
```powershell
.\livekit-server.exe --config livekit.yaml
```

---

## ⚙️ Шаг 3: Настройка переменных окружения

### Backend

Создайте или обновите файл `C:\woxly\apps\backend\.env`:

```env
# Database
DATABASE_URL=postgresql://woxly:woxly_password@localhost:5432/woxly?schema=public

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production

# Server
PORT=3001
FRONTEND_URL=http://localhost:3000

# LiveKit Configuration
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Email (опционально)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Frontend

Создайте или обновите файл `C:\woxly\apps\frontend\.env`:

```env
VITE_API_URL=http://localhost:3001
```

---

## 🚀 Шаг 4: Запуск приложения

### 1. Запустить базу данных (если еще не запущена)

```bash
cd C:\woxly\infra
docker-compose up -d postgres
```

### 2. Запустить миграции (первый раз)

```bash
cd C:\woxly\apps\backend
npm run db:migrate
npm run db:generate
```

### 3. Запустить Backend

```bash
cd C:\woxly\apps\backend
npm run dev
```

Должно появиться:
```
Server running on port 3001
[LiveKit] Configuration loaded
```

### 4. Запустить Frontend (в новом терминале)

```bash
cd C:\woxly\apps\frontend
npm run dev
```

Откройте: http://localhost:3000

---

## ✅ Шаг 5: Проверка работы

### 1. Проверка LiveKit сервера

Откройте: http://localhost:7881/

Должна появиться информация о сервере.

### 2. Проверка Backend

```bash
curl http://localhost:3001/api/health
```

Или откройте в браузере.

### 3. Тест звонка

1. Откройте приложение в двух браузерах/вкладках
2. Зарегистрируйте двух пользователей
3. Добавьте друг друга в друзья
4. Создайте голосовую комнату или позвоните
5. Проверьте:
   - ✅ Звук передается
   - ✅ Мут работает
   - ✅ Индикация говорящих работает

---

## 🐛 Решение проблем

### Проблема: npm install не работает в backend

**Решение 1:** Используйте `--legacy-peer-deps`
```bash
npm install --legacy-peer-deps
```

**Решение 2:** Очистите кэш и попробуйте снова
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**Решение 3:** Установите напрямую
```bash
npm install livekit-server-sdk@latest --save --legacy-peer-deps
```

### Проблема: LiveKit сервер не запускается

**Проверка Docker:**
```bash
docker ps -a | findstr livekit
docker logs woxly-livekit
```

**Перезапуск:**
```bash
docker-compose restart livekit
```

**Проверка портов:**
```bash
netstat -ano | findstr 7880
```

Если порт занят, измените в `livekit.yaml` и `docker-compose.yml`.

### Проблема: "Cannot connect to LiveKit server"

1. Проверьте, что сервер запущен:
```bash
curl http://localhost:7881/
```

2. Проверьте `.env`:
```env
LIVEKIT_URL=ws://localhost:7880
```

3. Проверьте firewall/антивирус

### Проблема: "API credentials not configured"

Добавьте в `apps/backend/.env`:
```env
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

И перезапустите backend.

### Проблема: Нет звука в звонке

1. **Проверьте разрешения микрофона** в браузере
2. **Откройте DevTools** (F12) → Console и ищите ошибки
3. **Проверьте localStorage:**
   ```javascript
   localStorage.getItem('outputVolume')  // должно быть > 0
   localStorage.getItem('globalMicMuted')  // должно быть 'false'
   ```
4. **Проверьте LiveKit логи:**
   ```bash
   docker logs -f woxly-livekit
   ```

### Проблема: Prisma ошибки

```bash
cd C:\woxly\apps\backend
npm run db:generate
npm run db:migrate
```

---

## 📝 Альтернативный способ установки

Если ничего не помогает, установите зависимости вручную:

```bash
# Backend
cd C:\woxly\apps\backend
npm install express socket.io jsonwebtoken bcrypt multer nodemailer zod cors dotenv speakeasy qrcode @prisma/client
npm install livekit-server-sdk --save

# Frontend  
cd C:\woxly\apps\frontend
npm install react react-dom react-router-dom zustand socket.io-client axios lucide-react clsx tailwind-merge
npm install livekit-client --save
```

---

## 🎯 Итоговый чеклист

- [ ] LiveKit сервер запущен (Docker или локально)
- [ ] Backend зависимости установлены
- [ ] Frontend зависимости установлены
- [ ] Переменные окружения настроены (`.env` файлы)
- [ ] База данных запущена
- [ ] Миграции выполнены
- [ ] Backend запущен (`npm run dev`)
- [ ] Frontend запущен (`npm run dev`)
- [ ] Тест звонка прошел успешно

---

## 🆘 Нужна помощь?

1. Прочитайте [LIVEKIT_MIGRATION.md](./LIVEKIT_MIGRATION.md)
2. Прочитайте [LIVEKIT_QUICK_START.md](./LIVEKIT_QUICK_START.md)
3. Проверьте логи:
   - Backend: в терминале где запущен `npm run dev`
   - Frontend: DevTools → Console (F12)
   - LiveKit: `docker logs woxly-livekit`
4. Посмотрите [LiveKit Documentation](https://docs.livekit.io/)

---

## ✨ Готово!

После выполнения всех шагов у вас должно работать приложение с LiveKit! 🎉

Если возникли проблемы - смотрите раздел "Решение проблем" выше.
