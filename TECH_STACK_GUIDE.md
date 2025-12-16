# 🚀 На каком языке создать голосовой мессенджер?

## 📋 Содержание

1. [Быстрый ответ](#-быстрый-ответ)
2. [Frontend (интерфейс)](#-frontend-интерфейс)
3. [Backend (сервер)](#-backend-сервер)
4. [WebRTC (голосовая связь)](#-webrtc-голосовая-связь)
5. [Готовые решения](#-готовые-решения)
6. [Рекомендации по уровню](#-рекомендации-по-уровню)
7. [Примеры кода](#-примеры-кода)

---

## ⚡ Быстрый ответ

### Для WOXLY с голосовой связью нужно:

```
┌─────────────────────────────────────────────────┐
│  Frontend (то что видит пользователь)           │
│  ✅ JavaScript/TypeScript                       │
│  ✅ React (или Vue, Svelte)                     │
│  ✅ WebRTC API (для голоса)                     │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Backend (сервер для управления)                │
│  ✅ Node.js (рекомендуется!)                    │
│  или Python (Django/FastAPI)                    │
│  или Go                                         │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Database (хранение данных)                     │
│  ✅ PostgreSQL (рекомендуется!)                 │
│  или MongoDB                                    │
└─────────────────────────────────────────────────┘
```

### 🏆 **Рекомендация:** Node.js + React + WebRTC

**Почему?**
- ✅ Один язык (JavaScript) для frontend и backend
- ✅ Огромное сообщество
- ✅ Отличная поддержка WebRTC
- ✅ Легко найти готовые решения
- ✅ Быстрая разработка

---

## 🎨 Frontend (интерфейс)

### Вариант 1: React + TypeScript (⭐ Рекомендуется)

**Что у вас сейчас!**

```tsx
// Компонент голосового чата
import { useState, useEffect, useRef } from 'react';

function VoiceChat() {
  const [isConnected, setIsConnected] = useState(false);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  
  const startCall = async () => {
    // WebRTC код для звонка
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true 
    });
    
    peerConnection.current = new RTCPeerConnection();
    stream.getTracks().forEach(track => {
      peerConnection.current?.addTrack(track, stream);
    });
  };
  
  return (
    <button onClick={startCall}>
      Начать звонок
    </button>
  );
}
```

**Плюсы:**
- ✅ Компонентный подход
- ✅ Огромная экосистема
- ✅ TypeScript для безопасности
- ✅ React Hooks для WebRTC
- ✅ Множество библиотек

**Минусы:**
- ❌ Сложнее для новичков
- ❌ Нужно настраивать сборку

**Библиотеки для WebRTC:**
- `simple-peer` - упрощённый WebRTC
- `peerjs` - P2P соединения
- `mediasoup-client` - профессиональное решение

---

### Вариант 2: Vue.js 3

```vue
<!-- VoiceChat.vue -->
<template>
  <button @click="startCall">
    Начать звонок
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isConnected = ref(false);
let peerConnection: RTCPeerConnection | null = null;

const startCall = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: true 
  });
  
  peerConnection = new RTCPeerConnection();
  stream.getTracks().forEach(track => {
    peerConnection?.addTrack(track, stream);
  });
};
</script>
```

**Плюсы:**
- ✅ Проще чем React
- ✅ Меньше boilerplate кода
- ✅ Хорошая документация
- ✅ Composition API

**Минусы:**
- ❌ Меньше библиотек для WebRTC
- ❌ Меньше сообщество

---

### Вариант 3: Svelte

```svelte
<!-- VoiceChat.svelte -->
<script lang="ts">
  let isConnected = false;
  let peerConnection: RTCPeerConnection | null = null;
  
  async function startCall() {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true 
    });
    
    peerConnection = new RTCPeerConnection();
    stream.getTracks().forEach(track => {
      peerConnection?.addTrack(track, stream);
    });
  }
</script>

<button on:click={startCall}>
  Начать звонок
</button>
```

**Плюсы:**
- ✅ Самый простой синтаксис
- ✅ Очень быстрый
- ✅ Маленький bundle

**Минусы:**
- ❌ Мало готовых решений для WebRTC
- ❌ Маленькое сообщество

---

### 🏆 Вердикт Frontend: React + TypeScript

**Почему:**
- Уже используется в WOXLY
- Больше всего библиотек для WebRTC
- Легче найти решения проблем
- Проще нанять разработчиков

---

## 🔧 Backend (сервер)

### Вариант 1: Node.js + Express (⭐ Рекомендуется)

```javascript
// server.js
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// WebSocket для сигнализации WebRTC
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Обработка WebRTC сигналов
  socket.on('webrtc-offer', (data) => {
    socket.to(data.to).emit('webrtc-offer', {
      from: socket.id,
      offer: data.offer
    });
  });
  
  socket.on('webrtc-answer', (data) => {
    socket.to(data.to).emit('webrtc-answer', {
      from: socket.id,
      answer: data.answer
    });
  });
  
  socket.on('ice-candidate', (data) => {
    socket.to(data.to).emit('ice-candidate', {
      from: socket.id,
      candidate: data.candidate
    });
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

**Плюсы:**
- ✅ Один язык с frontend (JavaScript)
- ✅ Socket.IO для WebSocket
- ✅ Огромная экосистема
- ✅ Легко найти примеры WebRTC
- ✅ Быстрая разработка

**Минусы:**
- ❌ Однопоточный (но есть кластеризация)
- ❌ Может быть медленнее Go/Rust

**Библиотеки:**
- `socket.io` - WebSocket
- `express` - HTTP сервер
- `mediasoup` - SFU для WebRTC (профессиональное)
- `jsonwebtoken` - JWT авторизация
- `bcrypt` - Хеширование паролей

---

### Вариант 2: Python + FastAPI

```python
# main.py
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket для WebRTC сигнализации
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    
    while True:
        data = await websocket.receive_json()
        
        if data['type'] == 'offer':
            # Переслать offer другому клиенту
            await websocket.send_json({
                'type': 'offer',
                'from': client_id,
                'offer': data['offer']
            })
        
        elif data['type'] == 'answer':
            # Переслать answer
            await websocket.send_json({
                'type': 'answer',
                'from': client_id,
                'answer': data['answer']
            })

# REST API
@app.get("/api/users")
async def get_users():
    return {"users": []}

@app.post("/api/auth/login")
async def login(email: str, password: str):
    return {"token": "jwt_token"}
```

**Плюсы:**
- ✅ Быстрый (почти как Node.js)
- ✅ Хорошая типизация
- ✅ Отличная документация
- ✅ Async/await поддержка

**Минусы:**
- ❌ Два языка (Python + JavaScript)
- ❌ Меньше готовых WebRTC решений
- ❌ Медленнее Node.js для WebSocket

---

### Вариант 3: Go

```go
// main.go
package main

import (
    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true
    },
}

func handleWebSocket(c *gin.Context) {
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        return
    }
    defer conn.Close()
    
    for {
        var msg map[string]interface{}
        err := conn.ReadJSON(&msg)
        if err != nil {
            break
        }
        
        // Обработка WebRTC сигналов
        if msg["type"] == "offer" {
            conn.WriteJSON(map[string]interface{}{
                "type": "offer",
                "offer": msg["offer"],
            })
        }
    }
}

func main() {
    r := gin.Default()
    
    r.GET("/ws", handleWebSocket)
    r.GET("/api/users", getUsers)
    
    r.Run(":3000")
}
```

**Плюсы:**
- ✅ Очень быстрый
- ✅ Низкое потребление памяти
- ✅ Concurrency из коробки
- ✅ Идеально для высоких нагрузок

**Минусы:**
- ❌ Два языка (Go + JavaScript)
- ❌ Сложнее для новичков
- ❌ Меньше библиотек

---

### 🏆 Вердикт Backend: Node.js + Express + Socket.IO

**Почему:**
- Од��н язык с frontend
- Лучшая поддержка WebRTC
- Проще разрабатывать
- Больше готовых решений

---

## 🎙️ WebRTC (голосовая связь)

### Что такое WebRTC?

**WebRTC** = Web Real-Time Communication

Это встроенная в браузеры технология для:
- ✅ Аудио/видео звонков
- ✅ Передачи данных P2P
- ✅ Screen sharing

### Как работает WebRTC?

```
User A                  Signaling Server              User B
  │                            │                         │
  │  1. Создать Offer          │                         │
  ├───────────────────────────►│                         │
  │                            │  2. Переслать Offer     │
  │                            ├────────────────────────►│
  │                            │                         │
  │                            │  3. Создать Answer      │
  │                            │◄────────────────────────┤
  │  4. Переслать Answer       │                         │
  │◄───────────────────────────┤                         │
  │                            │                         │
  │  5. Обмен ICE кандидатами  │                         │
  │◄──────────────────────────►│◄───────────────────────►│
  │                            │                         │
  │  6. ПРЯМОЕ P2P соединение                           │
  │◄────────────────────────────────────────────────────►│
  │         (голос идёт напрямую!)                       │
```

### Базовый код WebRTC

```typescript
// 1. Получить доступ к микрофону
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: true,
  video: false 
});

// 2. Создать RTCPeerConnection
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});

// 3. Добавить локальный аудио поток
stream.getTracks().forEach(track => {
  peerConnection.addTrack(track, stream);
});

// 4. Создать offer (инициатор звонка)
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

// 5. Отправить offer через сигнальный сервер
socket.emit('webrtc-offer', { 
  to: friendId, 
  offer: offer 
});

// 6. Получить удалённый поток
peerConnection.ontrack = (event) => {
  const remoteAudio = new Audio();
  remoteAudio.srcObject = event.streams[0];
  remoteAudio.play();
};

// 7. Обработка ICE кандидатов
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('ice-candidate', {
      to: friendId,
      candidate: event.candidate
    });
  }
};
```

### Библиотеки для упрощения WebRTC

#### 1. Simple Peer (⭐ Рекомендуется для начинающих)

```javascript
import SimplePeer from 'simple-peer';

// Инициатор звонка
const peer = new SimplePeer({ 
  initiator: true,
  stream: localStream 
});

// Получить сигнальные данные
peer.on('signal', data => {
  socket.emit('webrtc-signal', { to: friendId, signal: data });
});

// Получить удалённый поток
peer.on('stream', remoteStream => {
  remoteAudio.srcObject = remoteStream;
  remoteAudio.play();
});

// Когда получили сигнал от другого пользователя
socket.on('webrtc-signal', data => {
  peer.signal(data.signal);
});
```

**Плюсы:**
- ✅ Очень простой API
- ✅ Скрывает сложность WebRTC
- ✅ Автоматический обмен ICE

**Минусы:**
- ❌ Меньше контроля
- ❌ Только P2P (2 человека)

---

#### 2. PeerJS

```javascript
import Peer from 'peerjs';

// Создать peer
const peer = new Peer('my-user-id', {
  host: 'peerjs-server.com',
  port: 443,
  secure: true
});

// Позвонить другу
const call = peer.call('friend-id', localStream);

// Получить удалённый поток
call.on('stream', remoteStream => {
  remoteAudio.srcObject = remoteStream;
  remoteAudio.play();
});

// Принять входящий звонок
peer.on('call', call => {
  call.answer(localStream);
  call.on('stream', remoteStream => {
    // ...
  });
});
```

**Плюсы:**
- ✅ Встроенный сигнальный сервер
- ✅ Простой API
- ✅ Готовое решение

**Минусы:**
- ❌ Нужен их сервер (или свой)
- ❌ Только P2P

---

#### 3. Mediasoup (⭐ Для профессиональных проектов)

**Поддерживает:**
- ✅ Групповые звонки (3+ человек)
- ✅ SFU архитектура
- ✅ Масштабируемость
- ✅ Качественное аудио

```javascript
// Client
import { Device } from 'mediasoup-client';

const device = new Device();

// Подключение к серверу
const routerRtpCapabilities = await socket.request('getRouterRtpCapabilities');
await device.load({ routerRtpCapabilities });

// Создать transport для отправки
const sendTransport = device.createSendTransport(transportOptions);

// Создать producer (отправка аудио)
const audioProducer = await sendTransport.produce({
  track: localStream.getAudioTracks()[0]
});

// Создать consumer (получение аудио)
const consumer = await recvTransport.consume({
  id: consumerId,
  producerId: producerId,
  kind: 'audio',
  rtpParameters: rtpParameters
});

const remoteStream = new MediaStream([consumer.track]);
```

**Плюсы:**
- ✅ Групповые звонки
- ✅ Профессиональное качество
- ✅ Масштабируется
- ✅ Используется в Discord

**Минусы:**
- ❌ Очень сложный
- ❌ Нужен мощный сервер
- ❌ Долгая настройка

---

### 🏆 Вердикт WebRTC:

**Для начинающих:** Simple Peer  
**Для среднего уровня:** PeerJS  
**Для профи:** Mediasoup  

---

## 🎁 Готовые решения

### Вариант 1: Agora.io (⭐ Рекомендуется)

**Сервис для голосовой/видео связи**

```javascript
import AgoraRTC from 'agora-rtc-sdk-ng';

const client = AgoraRTC.createClient({ 
  mode: 'rtc', 
  codec: 'vp8' 
});

// Подключение к комнате
await client.join(
  'YOUR_APP_ID',
  'room-name',
  null,
  userId
);

// Создать аудио трек
const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();

// Опубликовать
await client.publish([localAudioTrack]);

// Слушать удалённых пользователей
client.on('user-published', async (user, mediaType) => {
  await client.subscribe(user, mediaType);
  
  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
});
```

**Плюсы:**
- ✅ Работает из коробки
- ✅ Групповые звонки
- ✅ Отличное качество
- ✅ Масштабируется автоматически
- ✅ Бесплатно до 10,000 минут/месяц

**Минусы:**
- ❌ Платный (после лимита)
- ❌ Зависимость от сервиса

**Цена:** $0.99 за 1000 минут

---

### Вариант 2: Twilio

```javascript
import { connect } from 'twilio-video';

const room = await connect('room-token', {
  name: 'my-room',
  audio: true,
  video: false
});

// Слушать участников
room.on('participantConnected', participant => {
  participant.tracks.forEach(publication => {
    if (publication.track) {
      const audioElement = publication.track.attach();
      document.body.appendChild(audioElement);
    }
  });
});
```

**Плюсы:**
- ✅ Очень надёжный
- ✅ Профессиональный
- ✅ Отличная документация

**Минусы:**
- ❌ Дорогой
- ❌ Сложная оплата

---

### Вариант 3: Daily.co

```javascript
import DailyIframe from '@daily-co/daily-js';

const callFrame = DailyIframe.createFrame({
  showLeaveButton: true,
  iframeStyle: {
    position: 'fixed',
    width: '100%',
    height: '100%'
  }
});

callFrame.join({ url: 'https://your-domain.daily.co/room-name' });
```

**Плюсы:**
- ✅ Самый простой
- ✅ Встроенный UI (можно использовать свой)
- ✅ Бесплатно до 10 участников

**Минусы:**
- ❌ Меньше контроля

---

### 🏆 Вердикт готовые решения:

**Для MVP:** Daily.co (самый простой)  
**Для продакшена:** Agora.io (лучшее соотношение)  
**Для enterprise:** Twilio  

---

## 🎓 Рекомендации по уровню

### Начинающий (0-1 год опыта)

```
Frontend: React + TypeScript
Backend:  Node.js + Express
WebRTC:   Simple Peer
Или:      Daily.co (готовое решение)
```

**Стек:**
```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install socket.io-client simple-peer
```

**Время разработки:** 2-3 недели для базового прототипа

---

### Средний (1-3 года опыта)

```
Frontend: React + TypeScript + Vite
Backend:  Node.js + Express + Socket.IO
WebRTC:   Чистый WebRTC API или PeerJS
Database: PostgreSQL
Auth:     JWT
```

**Стек:**
```bash
# Frontend
npm create vite@latest frontend -- --template react-ts

# Backend
mkdir backend && cd backend
npm init -y
npm install express socket.io cors jsonwebtoken bcryptjs pg
```

**Время разработки:** 1-2 месяца для полноценного приложения

---

### Продвинутый (3+ лет опыта)

```
Frontend:  React + TypeScript + Vite + Tailwind
Backend:   Node.js + NestJS + Mediasoup
WebRTC:    Mediasoup (SFU)
Database:  PostgreSQL + Redis
Auth:      JWT + Refresh tokens
Deploy:    Docker + Kubernetes
Monitoring: Sentry + Prometheus
```

**Архитектура:**
```
┌─────────────┐
│  Frontend   │  React + WebRTC client
└──────┬──────┘
       │
┌──────▼──────┐
│  API Gateway│  Nginx
└──────┬──────┘
       │
    ┌──┴──┐
┌───▼───┐ │
│Auth   │ │
│Service│ │
└───┬───┘ │
    │   ┌─▼─────┐
    │   │WebRTC │
    │   │Service│
    │   └───┬───┘
    │       │
┌───▼───────▼───┐
│  PostgreSQL   │
└───────────────┘
```

**Время разработки:** 3-6 месяцев для production-ready приложения

---

## 💻 Примеры кода

### Пример 1: Простой P2P звонок (Simple Peer)

**Frontend:**
```typescript
// VoiceChat.tsx
import { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

export function VoiceChat() {
  const [myId, setMyId] = useState('');
  const [friendId, setFriendId] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Получить свой ID
    socket.on('your-id', (id) => {
      setMyId(id);
    });

    // Получить входящий звонок
    socket.on('incoming-call', async ({ from, signal }) => {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });
      streamRef.current = stream;

      const peer = new SimplePeer({
        initiator: false,
        stream: stream,
        trickle: false
      });

      peer.on('signal', (data) => {
        socket.emit('answer-call', { to: from, signal: data });
      });

      peer.on('stream', (remoteStream) => {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play();
      });

      peer.signal(signal);
      peerRef.current = peer;
      setIsInCall(true);
    });

    return () => {
      socket.off('your-id');
      socket.off('incoming-call');
    };
  }, []);

  const callFriend = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true 
    });
    streamRef.current = stream;

    const peer = new SimplePeer({
      initiator: true,
      stream: stream,
      trickle: false
    });

    peer.on('signal', (data) => {
      socket.emit('call-user', { to: friendId, signal: data });
    });

    peer.on('stream', (remoteStream) => {
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.play();
    });

    socket.on('call-accepted', ({ signal }) => {
      peer.signal(signal);
    });

    peerRef.current = peer;
    setIsInCall(true);
  };

  const endCall = () => {
    peerRef.current?.destroy();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setIsInCall(false);
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <p>Ваш ID: {myId}</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="ID друга"
          value={friendId}
          onChange={(e) => setFriendId(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      {!isInCall ? (
        <button 
          onClick={callFriend}
          className="bg-primary text-white px-4 py-2 rounded"
        >
          Позвонить
        </button>
      ) : (
        <button 
          onClick={endCall}
          className="bg-destructive text-white px-4 py-2 rounded"
        >
          Завершить звонок
        </button>
      )}
    </div>
  );
}
```

**Backend:**
```javascript
// server.js
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Отправить ID пользователю
  socket.emit('your-id', socket.id);

  // Обработка звонка
  socket.on('call-user', ({ to, signal }) => {
    io.to(to).emit('incoming-call', {
      from: socket.id,
      signal: signal
    });
  });

  // Ответ на звонок
  socket.on('answer-call', ({ to, signal }) => {
    io.to(to).emit('call-accepted', { signal });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

### Пример 2: Групповой звонок (Agora.io)

```typescript
// GroupVoiceChat.tsx
import { useState, useEffect } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  ILocalAudioTrack 
} from 'agora-rtc-sdk-ng';

const APP_ID = 'your-agora-app-id';

export function GroupVoiceChat({ roomId }: { roomId: string }) {
  const [client] = useState<IAgoraRTCClient>(
    AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
  );
  const [localAudioTrack, setLocalAudioTrack] = 
    useState<ILocalAudioTrack | null>(null);
  const [isInRoom, setIsInRoom] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);

  const joinRoom = async () => {
    // Получить токен с вашего сервера
    const token = await fetch(`/api/agora/token?room=${roomId}`)
      .then(r => r.json())
      .then(d => d.token);

    // Присоединиться
    await client.join(APP_ID, roomId, token, null);

    // Создать локальный аудио трек
    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    setLocalAudioTrack(audioTrack);

    // Опубликовать
    await client.publish([audioTrack]);

    setIsInRoom(true);
  };

  const leaveRoom = async () => {
    localAudioTrack?.close();
    await client.leave();
    setIsInRoom(false);
  };

  useEffect(() => {
    // Слушать новых участников
    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);

      if (mediaType === 'audio') {
        user.audioTrack?.play();
        setParticipants(prev => [...prev, user.uid.toString()]);
      }
    });

    client.on('user-unpublished', (user) => {
      setParticipants(prev => 
        prev.filter(id => id !== user.uid.toString())
      );
    });

    return () => {
      client.removeAllListeners();
    };
  }, [client]);

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">
        Комната: {roomId}
      </h2>

      <div className="mb-4">
        <h3>Участники ({participants.length}):</h3>
        <ul>
          {participants.map(id => (
            <li key={id}>{id}</li>
          ))}
        </ul>
      </div>

      {!isInRoom ? (
        <button 
          onClick={joinRoom}
          className="bg-primary text-white px-4 py-2 rounded"
        >
          Присоединиться
        </button>
      ) : (
        <button 
          onClick={leaveRoom}
          className="bg-destructive text-white px-4 py-2 rounded"
        >
          Выйти
        </button>
      )}
    </div>
  );
}
```

---

## 🎯 Итого: Рекомендуемый стек для WOXLY

### Полный стек:

```yaml
Frontend:
  - React 18
  - TypeScript
  - Vite
  - Tailwind CSS
  - Socket.IO Client
  - Simple Peer (или Agora.io)

Backend:
  - Node.js 18+
  - Express
  - Socket.IO
  - PostgreSQL
  - JWT

WebRTC:
  - Simple Peer (для начала)
  - Agora.io (для продакшена)

DevOps:
  - Docker
  - Nginx
  - Let's Encrypt (SSL)
```

### Команды для старта:

```bash
# Frontend (уже готов!)
cd woxly
npm install socket.io-client simple-peer

# Backend (создать новый)
mkdir woxly-backend
cd woxly-backend
npm init -y
npm install express socket.io cors dotenv pg jsonwebtoken bcryptjs
npm install -D typescript @types/node @types/express ts-node nodemon

# Создать структуру
mkdir src
touch src/index.ts
touch .env
```

---

## 📚 Полезные ресурсы

### Обучающие материалы:

**WebRTC:**
- [WebRTC для начинающих (YouTube)](https://www.youtube.com/watch?v=WmR9IMUD_CY)
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [WebRTC samples](https://webrtc.github.io/samples/)

**Socket.IO:**
- [Официальная документация](https://socket.io/docs/v4/)
- [Socket.IO Tutorial](https://socket.io/get-started/chat)

**Agora.io:**
- [Quickstart Guide](https://docs.agora.io/en/voice-calling/get-started/get-started-sdk)
- [Examples](https://github.com/AgoraIO/API-Examples-Web)

**Mediasoup:**
- [Официальная документация](https://mediasoup.org/documentation/v3/)
- [Demo приложение](https://github.com/versatica/mediasoup-demo)

---

## 🆘 Частые вопросы

### Сложно ли сделать WebRTC?

**Простой P2P (2 человека):** Средне (1-2 недели)  
**Групповой звонок (3+ человек):** Сложно (1-2 месяца)  
**С готовым решением (Agora):** Ле��ко (2-3 дня)

### Нужен ли мощный сервер?

**Для P2P:** Нет, сервер только для сигнализации  
**Для группового (SFU):** Да, зависит от количества участников  
**С Agora/Twilio:** Нет, они всё делают

### Сколько стоит?

**Self-hosted (свой сервер):**
- VPS: $5-20/месяц
- TURN сервер: $10-50/месяц

**Agora.io:**
- Бесплатно: 10,000 минут/месяц
- Платно: $0.99 за 1000 минут

**Twilio:**
- $0.0015 за минуту на участника

---

<div align="center">

**Успехов в разработке! 🚀**

</div>
