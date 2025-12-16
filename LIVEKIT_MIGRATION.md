# 🚀 Миграция с WebRTC на LiveKit

## 📋 Что изменилось

Проект Woxly был обновлен для использования **LiveKit** вместо чистого WebRTC. Это дает следующие преимущества:

### ✅ Преимущества LiveKit

1. **Лучшая масштабируемость** - поддержка сотен участников в одной комнате
2. **Автоматическая оптимизация** - адаптивный битрейт и качество
3. **Надежность** - автоматическое переподключение и восстановление
4. **Простота** - меньше кода, меньше багов
5. **Профессиональное качество** - используется в продакшен-приложениях

### 🔄 Что было заменено

| Старое (WebRTC) | Новое (LiveKit) |
|-----------------|-----------------|
| `WebRTCManager` | `LiveKitManager` |
| `CallModal.tsx` | `CallModal.LiveKit.tsx` |
| Ручная сигнализация через Socket.IO | Встроенная сигнализация LiveKit |
| STUN/TURN сервера | Встроенный SFU сервер |
| P2P соединения | SFU архитектура |

---

## 🛠️ Установка и настройка

### 1. Установка зависимостей

Зависимости уже добавлены в `package.json`:

**Frontend:**
```bash
cd apps/frontend
npm install
# livekit-client уже установлен
```

**Backend:**
```bash
cd apps/backend
npm install
# livekit-server-sdk уже добавлен в package.json
```

### 2. Настройка LiveKit сервера

#### Вариант A: Docker (Рекомендуется)

LiveKit сервер уже добавлен в `docker-compose.yml`:

```bash
cd infra
docker-compose up -d livekit
```

Сервер будет доступен на:
- WebSocket: `ws://localhost:7880`
- HTTP API: `http://localhost:7881`

#### Вариант B: Локальная установка

1. Скачайте LiveKit сервер:
```bash
# Windows
curl -L https://github.com/livekit/livekit/releases/latest/download/livekit-server-windows-amd64.exe -o livekit-server.exe

# Linux/Mac
curl -L https://github.com/livekit/livekit/releases/latest/download/livekit-server-linux-amd64 -o livekit-server
chmod +x livekit-server
```

2. Запустите сервер:
```bash
# Windows
livekit-server.exe --config infra/livekit.yaml

# Linux/Mac
./livekit-server --config infra/livekit.yaml
```

#### Вариант C: LiveKit Cloud (Продакшен)

1. Зарегистрируйтесь на https://cloud.livekit.io
2. Создайте проект
3. Получите API ключи
4. Добавьте в `.env`:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### 3. Настройка переменных окружения

**Backend (.env):**
```env
# LiveKit Configuration
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

**Frontend (.env):**
```env
# API URL (без изменений)
VITE_API_URL=http://localhost:3001
```

---

## 🔧 Использование

### Для разработчиков

#### 1. Запуск всех сервисов

```bash
# Запустить все через Docker
cd infra
docker-compose up -d

# Или запустить локально
cd apps/backend
npm run dev

cd apps/frontend
npm run dev
```

#### 2. Использование нового CallModal

В вашем коде замените старый `CallModal` на новый:

```typescript
// Старый способ (WebRTC)
import CallModal from './components/CallModal';

// Новый способ (LiveKit)
import CallModalLiveKit from './components/CallModal.LiveKit';

// Использование
<CallModalLiveKit
  open={isCallModalOpen}
  onClose={() => setIsCallModalOpen(false)}
  otherUser={otherUser}
  groupRoom={currentRoom}
  isIncoming={isIncoming}
  onAccept={handleAcceptCall}
  onReject={handleRejectCall}
/>
```

#### 3. API для получения токена

Новый endpoint для получения LiveKit токена:

```typescript
// POST /api/rooms/:roomId/livekit-token
const response = await axios.post(
  `${API_URL}/rooms/${roomId}/livekit-token`,
  {},
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const { token: livekitToken, url } = response.data;
```

---

## 📝 Изменения в коде

### Новые файлы

1. **`apps/frontend/src/utils/livekit.ts`** - LiveKit менеджер
2. **`apps/frontend/src/pages/app/components/CallModal.LiveKit.tsx`** - Новый компонент звонков
3. **`apps/backend/src/utils/livekit.ts`** - Утилиты для создания токенов
4. **`infra/livekit.yaml`** - Конфигурация LiveKit сервера

### Измененные файлы

1. **`apps/backend/src/controllers/rooms.ts`** - Добавлен `getLiveKitToken`
2. **`apps/backend/src/routes/rooms.ts`** - Добавлен роут `/livekit-token`
3. **`apps/backend/package.json`** - Добавлен `livekit-server-sdk`
4. **`apps/frontend/package.json`** - Добавлен `livekit-client`
5. **`infra/docker-compose.yml`** - Добавлен сервис `livekit`

### Старые файлы (можно удалить после тестирования)

- `apps/frontend/src/utils/webrtc.ts` - Старый WebRTC менеджер
- `apps/frontend/src/pages/app/components/CallModal.tsx` - Старый компонент (если не нужен)

---

## 🧪 Тестирование

### 1. Проверка LiveKit сервера

```bash
# Проверить, что сервер запущен
curl http://localhost:7881/

# Должен вернуть информацию о сервере
```

### 2. Тест звонка

1. Откройте приложение в двух браузерах/окнах
2. Войдите под разными пользователями
3. Создайте голосовую комнату или позвоните другу
4. Проверьте:
   - ✅ Звук передается
   - ✅ Мут работает
   - ✅ Deafen работает
   - ✅ Индикация говорящих работает
   - ✅ Переподключение работает

### 3. Проверка логов

```bash
# Backend логи
cd apps/backend
npm run dev
# Смотрите на [LiveKit] сообщения

# LiveKit сервер логи
docker logs -f woxly-livekit
```

---

## 🐛 Решение проблем

### Проблема: "LiveKit API credentials not configured"

**Решение:** Добавьте переменные в `.env`:
```env
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

### Проблема: "Cannot connect to LiveKit server"

**Решение:**
1. Проверьте, что LiveKit сервер запущен: `docker ps | grep livekit`
2. Проверьте URL в `.env`: `LIVEKIT_URL=ws://localhost:7880`
3. Проверьте firewall/антивирус

### Проблема: "No audio in call"

**Решение:**
1. Проверьте разрешения микрофона в браузере
2. Откройте консоль браузера и ищите ошибки
3. Проверьте, что `outputVolume` не равна 0 в localStorage

### Проблема: "Participants not connecting"

**Решение:**
1. Проверьте, что оба пользователя получили токены
2. Проверьте логи LiveKit сервера
3. Проверьте, что firewall не блокирует UDP порты (50000-60000)

---

## 📊 Сравнение производительности

| Метрика | WebRTC (P2P) | LiveKit (SFU) |
|---------|--------------|---------------|
| Макс. участников | 4-8 | 100+ |
| Задержка | 50-200ms | 50-150ms |
| Качество звука | Хорошее | Отличное |
| Надежность | Средняя | Высокая |
| Нагрузка на клиент | Высокая | Низкая |
| Сложность кода | Высокая | Низкая |

---

## 🚀 Развертывание в продакшен

### Вариант 1: Self-hosted LiveKit

1. Установите LiveKit на выделенный сервер
2. Настройте SSL сертификаты
3. Настройте TURN сервер для NAT traversal
4. Обновите `LIVEKIT_URL` на `wss://your-domain.com`

### Вариант 2: LiveKit Cloud

1. Зарегистрируйтесь на https://cloud.livekit.io
2. Выберите тарифный план
3. Получите production API ключи
4. Обновите `.env` с production credentials

### Рекомендации для продакшена

```env
# Production .env
LIVEKIT_URL=wss://livekit.yourdomain.com
LIVEKIT_API_KEY=prod_xxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxx

# Включите webhook для мониторинга
LIVEKIT_WEBHOOK_URL=https://yourdomain.com/api/livekit/webhook
LIVEKIT_WEBHOOK_KEY=your-webhook-secret
```

---

## 📚 Дополнительные ресурсы

- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit Client SDK](https://docs.livekit.io/client-sdk-js/)
- [LiveKit Server SDK](https://docs.livekit.io/server-sdk-js/)
- [LiveKit Examples](https://github.com/livekit/livekit-examples)
- [LiveKit Cloud](https://cloud.livekit.io/)

---

## ✅ Чеклист миграции

- [x] Установлены зависимости (`livekit-client`, `livekit-server-sdk`)
- [x] Создан `LiveKitManager`
- [x] Создан новый `CallModal.LiveKit`
- [x] Добавлен endpoint для получения токенов
- [x] Настроен LiveKit сервер (docker-compose)
- [x] Добавлены переменные окружения
- [ ] Протестированы звонки 1-на-1
- [ ] Протестированы групповые звонки
- [ ] Проверена работа на мобильных устройствах
- [ ] Удалены старые WebRTC файлы (опционально)
- [ ] Обновлена документация для команды

---

## 🎉 Готово!

Теперь ваше приложение использует LiveKit для голосовых звонков. Наслаждайтесь улучшенным качеством и надежностью! 🚀

Если возникнут вопросы, обращайтесь к документации LiveKit или создайте issue в репозитории.
