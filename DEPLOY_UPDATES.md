# 🚀 Деплой Обновлений на Сервер

## Что Изменилось

### Backend (Нужно обновить):
- ✅ `apps/backend/src/controllers/auth.ts` - восстановление пароля
- ✅ `apps/backend/src/routes/auth.ts` - новые роуты
- ✅ `apps/backend/src/utils/email.ts` - улучшенный email

### Frontend (Нужно обновить):
- ✅ `apps/frontend/src/App.tsx` - новый роут
- ✅ `apps/frontend/src/pages/auth/ForgotPasswordPage.tsx` - новая страница
- ✅ `apps/frontend/src/pages/auth/LoginPage.tsx` - ссылка "Забыли пароль?"

### Desktop (НЕ нужно на сервер):
- ❌ `apps/desktop/*` - это только для локальных компьютеров пользователей

---

## 📋 Пошаговая Инструкция

### Шаг 1: Подключитесь к Серверу

```bash
ssh root@your-server-ip
# или
ssh your-username@your-server-ip
```

### Шаг 2: Перейдите в Папку Проекта

```bash
cd /root/woxly
# или где у вас установлен проект
```

### Шаг 3: Сделайте Бэкап (На всякий случай)

```bash
# Остановите приложение
pm2 stop all

# Создайте бэкап
cp -r /root/woxly /root/woxly-backup-$(date +%Y%m%d)

# Или только важные файлы
tar -czf woxly-backup-$(date +%Y%m%d).tar.gz apps/backend apps/frontend
```

### Шаг 4: Обновите Код

**Вариант А: Через Git (Рекомендуется)**

```bash
# Если у вас есть Git репозиторий
git pull origin main

# Или
git fetch origin
git reset --hard origin/main
```

**Вариант Б: Загрузить Файлы Вручную**

С вашего компьютера загрузите файлы на сервер:

```powershell
# На вашем компьютере (Windows PowerShell)
scp C:\woxly\apps\backend\src\controllers\auth.ts root@your-server:/root/woxly/apps/backend/src/controllers/
scp C:\woxly\apps\backend\src\routes\auth.ts root@your-server:/root/woxly/apps/backend/src/routes/
scp C:\woxly\apps\backend\src\utils\email.ts root@your-server:/root/woxly/apps/backend/src/utils/

# Frontend
scp C:\woxly\apps\frontend\src\App.tsx root@your-server:/root/woxly/apps/frontend/src/
scp C:\woxly\apps\frontend\src\pages\auth\LoginPage.tsx root@your-server:/root/woxly/apps/frontend/src/pages/auth/
scp C:\woxly\apps\frontend\src\pages\auth\ForgotPasswordPage.tsx root@your-server:/root/woxly/apps/frontend/src/pages/auth/
```

**Вариант В: Через FileZilla / WinSCP**

1. Откройте FileZilla или WinSCP
2. Подключитесь к серверу
3. Перетащите измененные файлы

### Шаг 5: Установите Зависимости (Если Нужно)

```bash
cd /root/woxly

# Backend (вряд ли нужно, но на всякий случай)
cd apps/backend
npm install

# Frontend (вряд ли нужно)
cd ../frontend
npm install
```

### Шаг 6: Пересоберите Frontend

```bash
cd /root/woxly/apps/frontend

# Остановите dev сервер если запущен
pm2 stop frontend

# Соберите production версию
npm run build

# Результат будет в dist/
```

### Шаг 7: Перезапустите Backend

```bash
cd /root/woxly/apps/backend

# Пересоберите TypeScript
npm run build

# Перезапустите через PM2
pm2 restart backend

# Проверьте логи
pm2 logs backend --lines 50
```

### Шаг 8: Обновите Nginx (Если Нужно)

Frontend должен раздаваться через Nginx:

```bash
# Проверьте конфигурацию Nginx
cat /etc/nginx/sites-available/woxly

# Должно быть примерно так:
# location / {
#   root /root/woxly/apps/frontend/dist;
#   try_files $uri $uri/ /index.html;
# }

# Перезапустите Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Шаг 9: Проверьте Что Все Работает

```bash
# Проверьте статус PM2
pm2 status

# Проверьте логи backend
pm2 logs backend --lines 20

# Проверьте что frontend собрался
ls -la /root/woxly/apps/frontend/dist/

# Проверьте что Nginx работает
sudo systemctl status nginx

# Проверьте что сайт доступен
curl http://localhost:3001/health
curl http://localhost
```

### Шаг 10: Тестирование

Откройте браузер и проверьте:

1. **Frontend:** https://woxly.ru
2. **Страница входа:** https://woxly.ru/#/auth/login
3. **Ссылка "Забыли пароль?"** должна быть видна
4. **Восстановление пароля:** https://woxly.ru/#/auth/forgot-password

---

## 🔧 Быстрая Команда (Все в Одном)

Если у вас Git:

```bash
cd /root/woxly

# Остановить приложения
pm2 stop all

# Обновить код
git pull origin main

# Пересобрать backend
cd apps/backend
npm run build

# Пересобрать frontend
cd ../frontend
npm run build

# Запустить приложения
cd /root/woxly
pm2 restart all

# Проверить статус
pm2 status
pm2 logs --lines 20
```

---

## 📝 Проверка После Деплоя

### 1. Проверьте Backend API

```bash
# На сервере
curl -X POST http://localhost:3001/api/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Должен вернуть:
# {"message":"Если email зарегистрирован, на него отправлено письмо с кодом восстановления"}
```

### 2. Проверьте Frontend

Откройте в браузере:
- https://woxly.ru/#/auth/login
- Нажмите "Забыли пароль?"
- Должна открыться страница восстановления

### 3. Проверьте Email (Если Настроен SMTP)

```bash
# Проверьте .env файл
cat /root/woxly/apps/backend/.env | grep SMTP

# Должно быть:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=noreply@woxly.com
```

---

## ⚠️ Возможные Проблемы

### Проблема 1: Backend не запускается

```bash
# Проверьте логи
pm2 logs backend --lines 50

# Возможная ошибка: TypeScript не скомпилировался
cd /root/woxly/apps/backend
npm run build

# Перезапустите
pm2 restart backend
```

### Проблема 2: Frontend не обновился

```bash
# Очистите кеш браузера (Ctrl+F5)

# Или пересоберите frontend
cd /root/woxly/apps/frontend
rm -rf dist
npm run build

# Перезапустите Nginx
sudo systemctl reload nginx
```

### Проблема 3: Страница 404

```bash
# Проверьте что Nginx правильно настроен
cat /etc/nginx/sites-available/woxly

# Должно быть:
# location / {
#   root /root/woxly/apps/frontend/dist;
#   try_files $uri $uri/ /index.html;
# }

# Перезапустите Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Проблема 4: Email не отправляется

```bash
# Проверьте SMTP настройки в .env
cat /root/woxly/apps/backend/.env | grep SMTP

# Проверьте логи backend
pm2 logs backend | grep -i email

# Для Gmail нужен App Password:
# 1. Включите 2FA в Google аккаунте
# 2. Создайте App Password: https://myaccount.google.com/apppasswords
# 3. Используйте этот пароль в SMTP_PASS
```

---

## 🎯 Минимальный Деплой (Только Нужные Файлы)

Если хотите обновить только измененные файлы:

### С вашего компьютера:

```powershell
# 1. Создайте временную папку
mkdir C:\woxly-deploy
cd C:\woxly-deploy

# 2. Скопируйте измененные файлы
mkdir -p backend\controllers backend\routes backend\utils
mkdir -p frontend\pages\auth

copy C:\woxly\apps\backend\src\controllers\auth.ts backend\controllers\
copy C:\woxly\apps\backend\src\routes\auth.ts backend\routes\
copy C:\woxly\apps\backend\src\utils\email.ts backend\utils\
copy C:\woxly\apps\frontend\src\App.tsx frontend\
copy C:\woxly\apps\frontend\src\pages\auth\LoginPage.tsx frontend\pages\auth\
copy C:\woxly\apps\frontend\src\pages\auth\ForgotPasswordPage.tsx frontend\pages\auth\

# 3. Создайте архив
tar -czf woxly-update.tar.gz backend frontend

# 4. Загрузите на сервер
scp woxly-update.tar.gz root@your-server:/root/
```

### На сервере:

```bash
# 1. Распакуйте
cd /root
tar -xzf woxly-update.tar.gz

# 2. Скопируйте файлы
cp backend/controllers/auth.ts /root/woxly/apps/backend/src/controllers/
cp backend/routes/auth.ts /root/woxly/apps/backend/src/routes/
cp backend/utils/email.ts /root/woxly/apps/backend/src/utils/
cp frontend/App.tsx /root/woxly/apps/frontend/src/
cp frontend/pages/auth/LoginPage.tsx /root/woxly/apps/frontend/src/pages/auth/
cp frontend/pages/auth/ForgotPasswordPage.tsx /root/woxly/apps/frontend/src/pages/auth/

# 3. Пересоберите и перезапустите
cd /root/woxly/apps/backend
npm run build
pm2 restart backend

cd /root/woxly/apps/frontend
npm run build
sudo systemctl reload nginx

# 4. Проверьте
pm2 status
pm2 logs backend --lines 20
```

---

## ✅ Финальная Проверка

После деплоя проверьте:

1. ✅ Backend запущен: `pm2 status`
2. ✅ Frontend собран: `ls /root/woxly/apps/frontend/dist/`
3. ✅ Nginx работает: `sudo systemctl status nginx`
4. ✅ Сайт открывается: https://woxly.ru
5. ✅ Страница входа: https://woxly.ru/#/auth/login
6. ✅ Ссылка "Забыли пароль?" видна
7. ✅ Страница восстановления работает: https://woxly.ru/#/auth/forgot-password
8. ✅ API отвечает: `curl http://localhost:3001/api/auth/request-password-reset`

---

## 🎉 Готово!

Теперь восстановление пароля работает на сервере!

**Что НЕ нужно деплоить:**
- ❌ `apps/desktop/*` - это только для Windows приложения
- ❌ `apps/installer/*` - это только для установщика
- ❌ Документация (*.md файлы) - опционально

**Что нужно деплоить:**
- ✅ `apps/backend/*` - сервер
- ✅ `apps/frontend/*` - веб-интерфейс
- ✅ `packages/shared/*` - общие типы (если изменились)

Если что-то не работает - пишите, разберемся! 🚀
