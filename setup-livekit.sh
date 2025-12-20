#!/bin/bash

# Скрипт для настройки LiveKit на сервере
# Выполняй команды по порядку на сервере

echo "=== WOXLY LiveKit Setup ==="

# 1. Остановим старый контейнер с коротким секретом
echo "1. Останавливаем старый LiveKit..."
docker stop woxly-livekit
docker rm woxly-livekit

# 2. Генерируем безопасный 64-символьный секрет
echo "2. Генерируем новый секрет..."
LIVEKIT_SECRET=$(openssl rand -hex 32)
echo "Секрет: $LIVEKIT_SECRET"
echo "СОХРАНИ ЕГО! Понадобится для .env"

# 3. Запускаем LiveKit с правильным секретом
echo "3. Запускаем LiveKit..."
docker run -d \
  --name woxly-livekit \
  --restart unless-stopped \
  --network woxly-network \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 50000-60000:50000-60000/udp \
  -e "LIVEKIT_KEYS=devkey: $LIVEKIT_SECRET" \
  livekit/livekit-server:latest \
  --dev

# 4. Ждем запуска
echo "4. Ждем запуска LiveKit..."
sleep 5

# 5. Проверяем логи
echo "5. Проверяем логи..."
docker logs woxly-livekit | tail -20

# 6. Настраиваем Backend .env
echo "6. Настраиваем Backend..."
cd /var/www/woxly/apps/backend

# Добавляем LiveKit переменные в .env
if grep -q "LIVEKIT_API_KEY" .env; then
  echo "LiveKit переменные уже есть в .env, обновляем..."
  sed -i "s/^LIVEKIT_API_KEY=.*/LIVEKIT_API_KEY=devkey/" .env
  sed -i "s/^LIVEKIT_API_SECRET=.*/LIVEKIT_API_SECRET=$LIVEKIT_SECRET/" .env
  sed -i "s|^LIVEKIT_URL=.*|LIVEKIT_URL=ws://localhost:7880|" .env
else
  echo "Добавляем LiveKit переменные в .env..."
  cat >> .env << EOF

# LiveKit Configuration (для голосовых звонков)
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=$LIVEKIT_SECRET
LIVEKIT_URL=ws://localhost:7880
EOF
fi

echo "7. Перезапускаем Backend..."
pm2 restart woxly-backend

echo "8. Ждем запуска Backend..."
sleep 3

echo "9. Проверяем Backend логи..."
pm2 logs woxly-backend --lines 20 --nostream

echo ""
echo "=== ГОТОВО! ==="
echo ""
echo "✅ LiveKit запущен на портах:"
echo "   - 7880 (WebRTC)"
echo "   - 7881 (HTTP API)"
echo "   - 50000-60000 (UDP для медиа)"
echo ""
echo "✅ Backend настроен:"
echo "   - LIVEKIT_API_KEY=devkey"
echo "   - LIVEKIT_API_SECRET=$LIVEKIT_SECRET"
echo "   - LIVEKIT_URL=ws://localhost:7880"
echo ""
echo "🧪 Проверить работу:"
echo "   curl http://localhost:7881"
echo ""
echo "📋 Для внешнего доступа настрой Nginx (см. setup-nginx-livekit.sh)"
echo ""
