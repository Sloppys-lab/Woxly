#!/bin/bash

# Скрипт для деплоя исправления SMTP на сервер
# Использование: ./deploy-smtp-fix.sh

set -e

SERVER="root@VM-396498"
PROJECT_DIR="/var/www/woxly"
BACKEND_DIR="$PROJECT_DIR/apps/backend"

echo "🚀 Deploying SMTP fix to production..."

# 1. Подключаемся к серверу и выполняем команды
ssh $SERVER << 'ENDSSH'
    set -e
    
    echo "📦 Navigating to project directory..."
    cd /var/www/woxly
    
    echo "🔄 Pulling latest changes..."
    git pull origin main
    
    echo "📦 Installing dependencies..."
    cd apps/backend
    npm install
    
    echo "🔨 Building backend..."
    npm run build
    
    echo "🔍 Checking .env file..."
    if [ ! -f .env ]; then
        echo "❌ ERROR: .env file not found!"
        exit 1
    fi
    
    # Проверяем наличие SMTP переменных
    if ! grep -q "SMTP_USER" .env; then
        echo "❌ ERROR: SMTP_USER not found in .env!"
        exit 1
    fi
    
    if ! grep -q "SMTP_PASS" .env; then
        echo "❌ ERROR: SMTP_PASS not found in .env!"
        exit 1
    fi
    
    echo "✅ .env file looks good"
    cat .env | grep SMTP
    
    echo "🔄 Restarting PM2 with new config..."
    pm2 delete woxly-backend || true
    
    # Запускаем с ecosystem конфигом
    if [ -f ecosystem.config.cjs ]; then
        echo "Using ecosystem.config.cjs..."
        pm2 start ecosystem.config.cjs
    else
        echo "Using direct start..."
        pm2 start dist/index.js --name woxly-backend
    fi
    
    pm2 save
    
    echo "⏳ Waiting for app to start..."
    sleep 3
    
    echo "📋 Checking logs..."
    pm2 logs woxly-backend --lines 30 --nostream | grep -i "smtp\|environment" || true
    
    echo "✅ Deployment complete!"
    echo ""
    echo "🧪 Test the fix with:"
    echo 'curl -X POST https://woxly.ru/api/auth/request-password-reset -H "Content-Type: application/json" -d '"'"'{"email":"ilyalove130919@gmail.com"}'"'"''
    
ENDSSH

echo ""
echo "✅ SMTP fix deployed successfully!"
echo "📝 Check logs with: ssh $SERVER 'pm2 logs woxly-backend'"
