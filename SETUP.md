# 🚀 Инструкция по установке WOXLY на сервере

## 🎯 Быстрая установка на VPS (woxly.ru)

### Подключение к серверу

```bash
ssh root@93.88.203.103
# Пароль: Vhj2ZMHRTkvbS
```

### 1. Обновление системы и установка необходимых пакетов

```bash
# Обновление системы
apt-get update && apt-get upgrade -y

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Установка PostgreSQL
apt-get install -y postgresql postgresql-contrib

# Установка Nginx
apt-get install -y nginx

# Установка PM2 для управления процессом
npm install -g pm2

# Установка Certbot для SSL
apt-get install -y certbot python3-certbot-nginx
```

### 2. Переход в директорию проекта

```bash
cd /var/www/woxly
```

### 3. Установка зависимостей проекта

```bash
npm install
```

### 4. Настройка PostgreSQL

```bash
# Переключение на пользователя postgres
sudo -u postgres psql
```

В psql выполните:
```sql
CREATE DATABASE woxly;
CREATE USER woxly_user WITH PASSWORD 'Woxly2024SecurePass!';
GRANT ALL PRIVILEGES ON DATABASE woxly TO woxly_user;
\q
```

### 5. Создание .env файлов

**Backend .env:**
```bash
cd /var/www/woxly/apps/backend
cat > .env << 'EOF'
DATABASE_URL="postgresql://woxly_user:Woxly2024SecurePass!@localhost:5432/woxly?schema=public"
JWT_SECRET="woxly-jwt-secret-key-2024-production-min-32-chars"
JWT_REFRESH_SECRET="woxly-refresh-secret-key-2024-production-min-32-chars"
PORT=3001
FRONTEND_URL="https://woxly.ru"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@woxly.ru"
EOF
```

**Frontend .env:**
```bash
cd /var/www/woxly/apps/frontend
cat > .env << 'EOF'
VITE_API_URL=https://woxly.ru/api
VITE_WS_URL=wss://woxly.ru
EOF
```

### 6. Настройка Prisma и базы данных

```bash
cd /var/www/woxly/apps/backend
npm run db:generate
npm run db:migrate
```

### 7. Создание директории для загрузок

```bash
mkdir -p /var/www/woxly/apps/backend/uploads/avatars
chmod 755 /var/www/woxly/apps/backend/uploads/avatars
```

### 8. Сборка проекта

```bash
# Сборка backend
cd /var/www/woxly/apps/backend
npm run build

# Сборка frontend
cd /var/www/woxly/apps/frontend
npm run build
```

### 9. Настройка Nginx для woxly.ru

```bash
nano /etc/nginx/sites-available/woxly
```

Вставьте следующую конфигурацию:
```nginx
server {
    listen 80;
    server_name woxly.ru www.woxly.ru;

    # Frontend
    location / {
        root /var/www/woxly/apps/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (avatars)
    location /uploads {
        alias /var/www/woxly/apps/backend/uploads;
    }
}
```

Сохраните (Ctrl+O, Enter, Ctrl+X)

Активация конфигурации:
```bash
ln -s /etc/nginx/sites-available/woxly /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default  # удалить дефолтный сайт
nginx -t  # проверка конфигурации
systemctl reload nginx
```

### 10. Настройка DNS для домена woxly.ru

В панели управления доменом добавьте A-запись:
```
Тип: A
Имя: @ (или woxly.ru)
Значение: 93.88.203.103
TTL: 3600
```

И для www:
```
Тип: A
Имя: www
Значение: 93.88.203.103
TTL: 3600
```

### 11. Установка SSL сертификата (Let's Encrypt)

```bash
certbot --nginx -d woxly.ru -d www.woxly.ru
```

Следуйте инструкциям:
- Email: введите ваш email
- Согласитесь с условиями (A)
- Выберите редирект HTTP на HTTPS (2)

### 12. Запуск backend через PM2

```bash
cd /var/www/woxly/apps/backend
pm2 start dist/index.js --name woxly-backend
pm2 save
pm2 startup  # для автозапуска при перезагрузке сервера
```

### 13. Проверка работы

```bash
# Проверка backend
pm2 status
pm2 logs woxly-backend

# Проверка Nginx
systemctl status nginx

# Проверка PostgreSQL
systemctl status postgresql

# Проверка портов
netstat -tulpn | grep -E '3001|80|443'
```

Откройте в браузере: **https://woxly.ru**

---

## Локальная установка (для разработки)

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка базы данных

Создайте базу данных PostgreSQL:

```sql
CREATE DATABASE woxly;
```

### 3. Настройка переменных окружения

#### Backend

Создайте файл `apps/backend/.env`:

**Windows (PowerShell):**
```powershell
cd apps/backend
@"
DATABASE_URL="postgresql://user:password@localhost:5432/woxly?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"
PORT=3001
FRONTEND_URL="http://localhost:3000"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@woxly.com"
"@ | Out-File -FilePath .env -Encoding utf8
```

**Linux/Mac:**
```bash
cd apps/backend
cat > .env << 'EOF'
DATABASE_URL="postgresql://user:password@localhost:5432/woxly?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"
PORT=3001
FRONTEND_URL="http://localhost:3000"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@woxly.com"
EOF
```

**Или вручную:**
```bash
cd apps/backend
nano .env  # или vim .env, или любой текстовый редактор
```

#### Frontend

Создайте файл `apps/frontend/.env`:

**Windows (PowerShell):**
```powershell
cd apps/frontend
@"
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
"@ | Out-File -FilePath .env -Encoding utf8
```

**Linux/Mac:**
```bash
cd apps/frontend
cat > .env << 'EOF'
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
EOF
```

### 4. Настройка Prisma

```bash
# Вернуться в корень проекта
cd ../..

# Генерация Prisma Client
cd apps/backend
npm run db:generate

# Применение миграций (создание таблиц в БД)
npm run db:migrate

# Опционально: заполнить тестовыми данными
npm run db:seed
```

### 5. Запуск приложения

#### Backend (в отдельном терминале)

```bash
# Из корня проекта
npm run dev:backend

# Или из папки backend
cd apps/backend
npm run dev
```

#### Frontend (в отдельном терминале)

```bash
# Из корня проекта
npm run dev

# Или из папки frontend
cd apps/frontend
npm run dev
```

Приложение будет доступно по адресу: http://localhost:3000

## Docker установка

### 1. Настройка переменных окружения

Создайте файл `infra/.env`:

**Windows (PowerShell):**
```powershell
cd infra
@"
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
TURN_USERNAME=user
TURN_PASSWORD=pass
"@ | Out-File -FilePath .env -Encoding utf8
```

**Linux/Mac:**
```bash
cd infra
cat > .env << 'EOF'
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
TURN_USERNAME=user
TURN_PASSWORD=pass
EOF
```

### 2. Запуск через Docker Compose

```bash
cd infra
docker-compose up -d
```

### 3. Применение миграций

```bash
# Дождитесь запуска контейнера (30-60 секунд)
docker exec -it woxly-backend npm run db:migrate
```

### 4. Проверка статуса

```bash
docker-compose ps
docker-compose logs -f
```

## Структура проекта

```
woxly/
├── apps/
│   ├── frontend/          # React приложение
│   │   ├── src/
│   │   │   ├── pages/      # Страницы приложения
│   │   │   ├── store/      # Zustand stores
│   │   │   ├── utils/      # Утилиты (WebRTC)
│   │   │   └── hooks/      # React hooks
│   │   └── package.json
│   └── backend/           # Express сервер
│       ├── src/
│       │   ├── controllers/ # Контроллеры
│       │   ├── routes/      # Маршруты
│       │   ├── middleware/  # Middleware
│       │   ├── socket/      # Socket.IO
│       │   └── utils/       # Утилиты
│       └── package.json
├── packages/
│   ├── ui/                 # UI компоненты
│   │   └── src/
│   └── shared/             # Общие типы
│       └── src/
├── prisma/
│   └── schema.prisma       # Схема базы данных
└── infra/
    ├── docker-compose.yml
    ├── nginx.conf
    └── turnserver.conf
```

## API Endpoints

### Authentication
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
- `GET /api/friends/search?q=query` - Поиск пользователей
- `POST /api/friends/add` - Добавить друга
- `DELETE /api/friends/:friendId` - Удалить друга

### Rooms
- `GET /api/rooms` - Список комнат
- `POST /api/rooms` - Создать комнату
- `GET /api/rooms/:id` - Получить комнату
- `POST /api/rooms/:id/join` - Присоединиться
- `POST /api/rooms/:id/leave` - Выйти

### Messages
- `GET /api/messages?roomId=:id&limit=50&offset=0` - История сообщений
- `POST /api/messages` - Отправить сообщение
- `PUT /api/messages/:id` - Редактировать
- `DELETE /api/messages/:id` - Удалить

### Admin
- `GET /api/admin/stats` - Статистика
- `GET /api/admin/users` - Список пользователей
- `GET /api/admin/rooms` - Список комнат
- `GET /api/admin/messages` - Список сообщений

## Socket.IO Events

### Client → Server
- `join-room` - Присоединиться к комнате
- `leave-room` - Выйти из комнаты
- `send-message` - Отправить сообщение
- `typing` - Индикатор печати
- `status-change` - Изменить статус
- `webrtc-offer` - WebRTC offer
- `webrtc-answer` - WebRTC answer
- `ice-candidate` - ICE candidate

### Server → Client
- `new-message` - Новое сообщение
- `user-joined-room` - Пользователь присоединился
- `user-left-room` - Пользователь вышел
- `typing` - Пользователь печатает
- `friend-status-changed` - Изменение статуса друга
- `webrtc-offer` - WebRTC offer
- `webrtc-answer` - WebRTC answer
- `ice-candidate` - ICE candidate

## Разработка

### Добавление новых компонентов

1. UI компоненты добавляются в `packages/ui/src/`
2. Общие типы добавляются в `packages/shared/src/`
3. Страницы добавляются в `apps/frontend/src/pages/`

### Запуск миграций

```bash
cd apps/backend
npm run db:migrate
```

### Генерация Prisma Client

```bash
cd apps/backend
npm run db:generate
```

## 🔧 Troubleshooting (Решение проблем)

### Backend не запускается

```bash
# Проверка логов
pm2 logs woxly-backend --err

# Проверка что порт 3001 свободен
netstat -tulpn | grep 3001

# Проверка .env файла
cat /var/www/woxly/apps/backend/.env

# Перезапуск
pm2 restart woxly-backend
```

### Ошибка подключения к базе данных

```bash
# Проверка что PostgreSQL запущен
systemctl status postgresql

# Проверка подключения
sudo -u postgres psql -d woxly -c "SELECT 1;"

# Проверка прав пользователя
sudo -u postgres psql -c "\du woxly_user"
```

### Nginx возвращает 502 Bad Gateway

```bash
# Проверка что backend запущен
pm2 status

# Проверка конфигурации Nginx
nginx -t

# Проверка логов Nginx
tail -f /var/log/nginx/error.log
```

### SSL сертификат не работает

```bash
# Проверка сертификата
certbot certificates

# Обновление сертификата
certbot renew

# Проверка что домен указывает на сервер
nslookup woxly.ru
```

### Frontend не загружается

```bash
# Проверка что frontend собран
ls -la /var/www/woxly/apps/frontend/dist

# Пересборка frontend
cd /var/www/woxly/apps/frontend
npm run build

# Проверка прав доступа
chown -R www-data:www-data /var/www/woxly/apps/frontend/dist
```

### WebSocket не работает

```bash
# Проверка что в Nginx настроен /ws
grep -A 5 "location /ws" /etc/nginx/sites-available/woxly

# Проверка что backend слушает WebSocket
pm2 logs woxly-backend | grep -i socket
```

### Проблемы с загрузкой файлов (аватары)

```bash
# Проверка директории
ls -la /var/www/woxly/apps/backend/uploads/avatars

# Создание директории если нет
mkdir -p /var/www/woxly/apps/backend/uploads/avatars
chmod 755 /var/www/woxly/apps/backend/uploads/avatars
chown -R www-data:www-data /var/www/woxly/apps/backend/uploads
```

## 🔄 Обновление проекта на сервере

После загрузки новых файлов через Termius:

```bash
cd /var/www/woxly

# Установка новых зависимостей (если есть)
npm install

# Пересборка backend
cd apps/backend
npm run build

# Пересборка frontend
cd ../frontend
npm run build

# Перезапуск backend
pm2 restart woxly-backend

# Перезагрузка Nginx
systemctl reload nginx
```

## 📋 Полезные команды для управления сервером

### Просмотр логов

```bash
# Backend логи (в реальном времени)
pm2 logs woxly-backend

# Последние 100 строк логов backend
pm2 logs woxly-backend --lines 100

# Nginx логи ошибок
tail -f /var/log/nginx/error.log

# Nginx логи доступа
tail -f /var/log/nginx/access.log

# PostgreSQL логи
tail -f /var/log/postgresql/postgresql-*.log
```

### Перезапуск сервисов

```bash
# Backend
pm2 restart woxly-backend

# Nginx
systemctl restart nginx

# PostgreSQL
systemctl restart postgresql

# Все сервисы
pm2 restart woxly-backend && systemctl restart nginx && systemctl restart postgresql
```

### Проверка статуса

```bash
# Статус всех PM2 процессов
pm2 status

# Статус Nginx
systemctl status nginx

# Статус PostgreSQL
systemctl status postgresql

# Проверка портов
netstat -tulpn | grep -E '3001|80|443|5432'
```

### Управление базой данных

```bash
# Подключение к PostgreSQL
sudo -u postgres psql -d woxly

# В psql можно выполнить:
# \dt - список таблиц
# \d users - структура таблицы users
# SELECT * FROM users; - выборка данных
# \q - выход
```

### Резервное копирование базы данных

```bash
# Создание бэкапа
sudo -u postgres pg_dump woxly > /root/woxly_backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
sudo -u postgres psql woxly < /root/woxly_backup_YYYYMMDD_HHMMSS.sql
```

### Мониторинг ресурсов

```bash
# Использование памяти и CPU
htop

# Использование диска
df -h

# Использование памяти процессами
pm2 monit
```

## Лицензия

MIT

