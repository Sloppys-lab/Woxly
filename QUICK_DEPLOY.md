# 🚀 Быстрый деплой исправления SMTP

## Шаг 1: Запушить изменения

```bash
git push origin main
```

## Шаг 2: Деплой на сервер (выберите один способ)

### Способ A: Автоматический (Windows PowerShell)
```powershell
.\deploy-smtp-fix.ps1
```

### Способ B: Автоматический (Linux/Mac или Git Bash)
```bash
chmod +x deploy-smtp-fix.sh
./deploy-smtp-fix.sh
```

### Способ C: Ручной
```bash
ssh root@VM-396498

# На сервере:
cd /var/www/woxly
git pull origin main
cd apps/backend
npm install
npm run build

# Перезапуск PM2
pm2 delete woxly-backend
pm2 start ecosystem.config.cjs
pm2 save

# Проверка логов
pm2 logs woxly-backend --lines 30 | grep SMTP
```

## Шаг 3: Проверка

```bash
# Тест отправки email
curl -X POST https://woxly.ru/api/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"ilyalove130919@gmail.com"}'

# Проверка логов
ssh root@VM-396498 'pm2 logs woxly-backend --lines 20' | grep -i email
```

## ✅ Ожидаемый результат

В логах должно появиться:
```
Environment variables loaded from: /var/www/woxly/apps/backend/.env
SMTP_USER: ✓ SET
SMTP_PASS: ✓ SET
SMTP_HOST: smtp.gmail.com
Attempting to send Восстановление пароля email to ilyalove130919@gmail.com
Email sent successfully to ilyalove130919@gmail.com
```

## ❌ Если не работает

Смотрите подробную инструкцию: `SMTP_FIX_INSTRUCTIONS.md`
