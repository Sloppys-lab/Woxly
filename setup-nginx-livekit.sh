#!/bin/bash

# Скрипт для настройки Nginx для LiveKit (для внешнего доступа)
# Выполняй ТОЛЬКО если хочешь чтобы LiveKit был доступен извне

echo "=== Настройка Nginx для LiveKit ==="

# 1. Создаем конфиг для LiveKit
cat > /etc/nginx/sites-available/livekit << 'EOF'
server {
    listen 443 ssl http2;
    server_name woxly.ru;

    ssl_certificate /etc/letsencrypt/live/woxly.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/woxly.ru/privkey.pem;

    # LiveKit WebSocket (для клиентов)
    location /livekit {
        proxy_pass http://localhost:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # LiveKit HTTP API
    location /livekit-api/ {
        proxy_pass http://localhost:7881/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 2. Включаем конфиг
ln -sf /etc/nginx/sites-available/livekit /etc/nginx/sites-enabled/

# 3. Проверяем конфиг
nginx -t

# 4. Перезагружаем Nginx
systemctl reload nginx

# 5. Обновляем Backend .env для внешнего доступа
cd /var/www/woxly/apps/backend
sed -i "s|^LIVEKIT_URL=.*|LIVEKIT_URL=wss://woxly.ru/livekit|" .env

# 6. Перезапускаем Backend
pm2 restart woxly-backend

echo ""
echo "=== ГОТОВО! ==="
echo "✅ LiveKit доступен по адресу: wss://woxly.ru/livekit"
echo "✅ LiveKit API доступен по адресу: https://woxly.ru/livekit-api/"
echo ""
echo "🧪 Проверить:"
echo "   curl https://woxly.ru/livekit-api/"
echo ""
