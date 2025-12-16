# 🚀 Инструкция по настройке сервера

## ✅ Что уже сделано:
- [x] Установлены зависимости backend
- [x] Применены миграции базы данных
- [x] Исправлена ошибка TypeScript в livekit.ts

## 📝 Следующие шаги:

### 1. Загрузить исправленные файлы на сервер

Через Termius SFTP загрузите исправленный файл:
```
Локальный файл: C:\woxly\apps\backend\src\utils\livekit.ts
Путь на сервере: /var/www/woxly/apps/backend/src/utils/livekit.ts

Локальный файл: C:\woxly\apps\backend\src\controllers\rooms.ts  
Путь на сервере: /var/www/woxly/apps/backend/src/controllers/rooms.ts
```

### 2. Собрать backend на сервере

```bash
cd /var/www/woxly/apps/backend
npm run build
```

### 3. Установить Docker (для LiveKit)

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo apt update
sudo apt install docker-compose -y

# Проверка установки
docker --version
docker-compose --version
```

### 4. Запустить LiveKit и PostgreSQL

```bash
cd /var/www/woxly/infra
docker-compose up -d livekit postgres
```

Проверка:
```bash
docker ps
docker logs woxly-livekit
```

### 5. Запустить Backend

```bash
cd /var/www/woxly/apps/backend
npm start
```

Или для разработки:
```bash
npm run dev
```

### 6. Установить и собрать Frontend

```bash
cd /var/www/woxly/apps/frontend
npm install
npm run build
```

### 7. Настроить Nginx (опционально)

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/woxly
```

Добавьте конфигурацию:
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
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активируйте конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/woxly /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Настроить SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d woxly.ru -d www.woxly.ru
```

### 9. Настроить автозапуск (PM2)

```bash
# Установка PM2
npm install -g pm2

# Запуск backend через PM2
cd /var/www/woxly/apps/backend
pm2 start dist/index.js --name woxly-backend

# Автозапуск при перезагрузке
pm2 startup
pm2 save
```

## 🔍 Проверка работы

```bash
# Backend
curl http://localhost:3001/

# LiveKit
curl http://localhost:7881/

# Frontend (после сборки)
curl http://localhost/
```

## 🐛 Решение проблем

### Backend не запускается
```bash
cd /var/www/woxly/apps/backend
npm run build
cat .env | grep LIVEKIT
```

### LiveKit не работает
```bash
docker logs woxly-livekit
docker restart woxly-livekit
```

### База данных не подключается
```bash
sudo -u postgres psql
\l  # список баз данных
\du # список пользователей
```

## 📊 Мониторинг

```bash
# Логи backend (PM2)
pm2 logs woxly-backend

# Логи Docker
docker logs -f woxly-livekit
docker logs -f woxly-postgres

# Статус сервисов
pm2 status
docker ps
```

## 🎉 Готово!

После выполнения всех шагов ваше приложение будет доступно по адресу:
- Frontend: https://woxly.ru
- Backend API: https://woxly.ru/api
- LiveKit: wss://woxly.ru:7880

Удачи! 🚀
