# Инструкция по исправлению проблемы с отправкой email

## Проблема
Код подтверждения не приходит на почту из-за ошибки: `Missing credentials for "PLAIN"`

## Причина
PM2 не подхватывает переменные окружения из `.env` файла автоматически.

## Решение

### Шаг 1: Обновить код на сервере

```bash
# На сервере
cd /var/www/woxly
git pull origin main
```

### Шаг 2: Пересобрать backend

```bash
cd /var/www/woxly/apps/backend
npm install
npm run build
```

### Шаг 3: Проверить .env файл

```bash
# Убедитесь, что все SMTP переменные присутствуют
cat /var/www/woxly/apps/backend/.env | grep SMTP
```

Должно быть:
```
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="ilyalove130919@gmail.com"
SMTP_PASS="zezfllxerrrloomp"
SMTP_FROM="noreply@woxly.ru"
```

### Шаг 4: Перезапустить PM2 с новым конфигом

```bash
# Остановить текущий процесс
pm2 delete woxly-backend

# Запустить с ecosystem конфигом
cd /var/www/woxly/apps/backend
pm2 start ecosystem.config.cjs

# Сохранить конфигурацию
pm2 save
```

### Шаг 5: Проверить логи

```bash
# Проверить, что переменные загрузились
pm2 logs woxly-backend --lines 50 | grep "SMTP"
```

Вы должны увидеть:
```
SMTP_USER: ✓ SET
SMTP_PASS: ✓ SET
SMTP_HOST: smtp.gmail.com
```

### Шаг 6: Тестирование

```bash
# Тест восстановления пароля
curl -X POST https://woxly.ru/api/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"ilyalove130919@gmail.com"}'

# Проверить логи на ошибки
pm2 logs woxly-backend --lines 20 | grep -i "email\|error"
```

## Альтернативный метод (если ecosystem.config.cjs не работает)

Если PM2 все еще не загружает переменные, используйте dotenv-cli:

```bash
# Установить dotenv-cli глобально
npm install -g dotenv-cli

# Запустить PM2 через dotenv-cli
pm2 delete woxly-backend
cd /var/www/woxly/apps/backend
pm2 start "dotenv -e .env node dist/index.js" --name woxly-backend
pm2 save
```

## Проверка Gmail App Password

Если письма все еще не приходят, проверьте:

1. **App Password активен**: Зайдите в https://myaccount.google.com/apppasswords
2. **2FA включена**: App passwords работают только при включенной двухфакторной аутентификации
3. **Письма не в спаме**: Проверьте папку Spam в Gmail

## Дополнительная отладка

Если проблема сохраняется, добавьте более детальное логирование:

```bash
# Проверить, что nodemailer вообще инициализируется
pm2 logs woxly-backend --lines 100 | grep -A10 -B10 "credentials\|SMTP"
```
