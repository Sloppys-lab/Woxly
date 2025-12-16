# 🔍 Полный Аудит Проекта Woxly

## 📊 Архитектура Проекта

### Структура
```
woxly/
├── apps/
│   ├── backend/          # Node.js + Express + Socket.IO
│   ├── frontend/         # React + TypeScript + Vite
│   └── desktop/          # Electron оболочка
├── packages/
│   ├── shared/           # Общие типы TypeScript
│   └── ui/               # UI компоненты
└── prisma/              # База данных PostgreSQL
```

### Технологический Стек

**Backend:**
- Node.js + Express
- Socket.IO (реал-тайм коммуникация)
- PostgreSQL + Prisma ORM
- LiveKit (голосовая связь)
- JWT аутентификация
- Nodemailer (email)

**Frontend:**
- React 18 + TypeScript
- Vite (сборка)
- Tailwind CSS
- Zustand (state management)
- LiveKit Client (голосовая связь)
- Axios (HTTP)

**Desktop:**
- Electron 28
- electron-builder (сборка)
- electron-updater (автообновления)
- electron-store (настройки)

---

## 🎤 Голосовая Связь: LiveKit vs WebRTC

### Текущая Реализация: **LiveKit** ✅

**Преимущества:**
1. **SFU архитектура** - масштабируемость для групповых звонков
2. **Автоматическое управление качеством** - адаптивный битрейт
3. **Встроенная обработка аудио:**
   - Echo cancellation (подавление эха)
   - Noise suppression (шумоподавление)
   - Auto gain control (автоматическая регулировка громкости)
4. **Надежность:**
   - Автоматическое переподключение
   - Redundant encoding (дублирование пакетов)
   - DTX (экономия трафика)
5. **Простота интеграции** - готовое решение

**Как проверить что работает LiveKit:**
1. Откройте DevTools (F12) в приложении
2. Начните звонок
3. В консоли должны быть логи:
   ```
   [LiveKit] Connected to room: room-123
   [LiveKit] Participant connected: 456
   [LiveKit] Track subscribed: audio
   ```
4. Проверьте Network вкладку - должны быть WebSocket соединения к LiveKit серверу

**Альтернатива: Чистый WebRTC**
- ❌ Сложнее в реализации (нужен signaling сервер)
- ❌ Хуже масштабируется для групп (mesh топология)
- ✅ Больше контроля над процессом
- ✅ Меньше зависимостей

---

## 🚀 Улучшения для Голосовой Связи

### 1. **Krisp AI Noise Cancellation** 🎯
Интеграция профессионального шумоподавления:

```typescript
// apps/frontend/src/utils/krisp.ts
import { Room } from 'livekit-client';

export class KrispNoiseFilter {
  private audioContext: AudioContext;
  private processor: AudioWorkletNode | null = null;

  async init() {
    this.audioContext = new AudioContext({ sampleRate: 48000 });
    
    // Загружаем Krisp Audio Worklet
    await this.audioContext.audioWorklet.addModule('/krisp-processor.js');
    
    this.processor = new AudioWorkletNode(
      this.audioContext,
      'krisp-processor'
    );
  }

  async applyToTrack(track: MediaStreamTrack): Promise<MediaStreamTrack> {
    const stream = new MediaStream([track]);
    const source = this.audioContext.createMediaStreamSource(stream);
    
    source.connect(this.processor!);
    
    const destination = this.audioContext.createMediaStreamDestination();
    this.processor!.connect(destination);
    
    return destination.stream.getAudioTracks()[0];
  }
}
```

**Установка:**
```bash
npm install @krisp/web-sdk
```

### 2. **Spatial Audio (3D звук)** 🎧
Создание эффекта присутствия:

```typescript
// apps/frontend/src/utils/spatialAudio.ts
export class SpatialAudioManager {
  private audioContext: AudioContext;
  private panners: Map<string, PannerNode> = new Map();

  constructor() {
    this.audioContext = new AudioContext();
  }

  // Позиционирование участника в 3D пространстве
  setParticipantPosition(userId: string, x: number, y: number, z: number) {
    let panner = this.panners.get(userId);
    
    if (!panner) {
      panner = this.audioContext.createPanner();
      panner.panningModel = 'HRTF'; // Head-Related Transfer Function
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10;
      panner.rolloffFactor = 1;
      this.panners.set(userId, panner);
    }

    panner.setPosition(x, y, z);
  }

  attachToAudio(userId: string, audioElement: HTMLAudioElement) {
    const panner = this.panners.get(userId);
    if (!panner) return;

    const source = this.audioContext.createMediaElementSource(audioElement);
    source.connect(panner);
    panner.connect(this.audioContext.destination);
  }
}
```

### 3. **Voice Activity Detection (VAD)** 🗣️
Улучшенная детекция речи:

```typescript
// apps/frontend/src/utils/vad.ts
export class VoiceActivityDetector {
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private threshold: number = 30; // Порог громкости

  constructor(audioContext: AudioContext, source: MediaStreamAudioSourceNode) {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    source.connect(this.analyser);
  }

  isSpeaking(): boolean {
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Анализируем частоты речи (85-255 Hz для мужчин, 165-255 Hz для женщин)
    const voiceRange = this.dataArray.slice(10, 40);
    const average = voiceRange.reduce((a, b) => a + b) / voiceRange.length;
    
    return average > this.threshold;
  }

  setThreshold(value: number) {
    this.threshold = value;
  }
}
```

### 4. **Audio Visualizer** 📊
Визуализация звука для каждого участника:

```typescript
// apps/frontend/src/components/AudioVisualizer.tsx
import { useEffect, useRef } from 'react';

interface Props {
  audioTrack: MediaStreamTrack;
  color?: string;
}

export function AudioVisualizer({ audioTrack, color = '#ffbdd3' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const audioContext = new AudioContext();
    const stream = new MediaStream([audioTrack]);
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      audioContext.close();
    };
  }, [audioTrack, color]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={50}
      className="rounded-lg"
    />
  );
}
```

### 5. **Echo Cancellation Improvements** 🔇
Дополнительное подавление эха:

```typescript
// В LiveKitManager добавить:
audioCaptureDefaults: {
  autoGainControl: true,
  echoCancellation: {
    enabled: true,
    // Расширенные настройки
    echoCancellationType: 'browser', // или 'system'
  },
  noiseSuppression: {
    enabled: true,
    // Уровень подавления: 'low', 'medium', 'high', 'max'
    level: 'high',
  },
  sampleRate: 48000,
  channelCount: 1,
  latency: 0.01, // 10ms задержка для минимального эха
}
```

### 6. **Adaptive Bitrate Control** 📶
Автоматическая адаптация качества:

```typescript
// apps/frontend/src/utils/bitrateController.ts
export class BitrateController {
  private room: Room;
  private targetBitrate: number = 128000; // 128 kbps по умолчанию

  constructor(room: Room) {
    this.room = room;
    this.monitorConnection();
  }

  private async monitorConnection() {
    setInterval(async () => {
      const stats = await this.getConnectionStats();
      
      if (stats.packetLoss > 5) {
        // Высокая потеря пакетов - снижаем битрейт
        this.targetBitrate = Math.max(64000, this.targetBitrate * 0.8);
      } else if (stats.packetLoss < 1 && stats.rtt < 100) {
        // Хорошее соединение - повышаем битрейт
        this.targetBitrate = Math.min(256000, this.targetBitrate * 1.2);
      }

      await this.applyBitrate();
    }, 5000);
  }

  private async getConnectionStats() {
    // Получаем статистику WebRTC
    const stats = await this.room.localParticipant.getStats();
    return {
      packetLoss: 0, // Извлечь из stats
      rtt: 0, // Round-trip time
    };
  }

  private async applyBitrate() {
    const audioTrack = this.room.localParticipant.getTrackPublication(
      Track.Source.Microphone
    );
    
    if (audioTrack?.track) {
      // Применяем новый битрейт
      // LiveKit автоматически управляет этим через publishDefaults
    }
  }
}
```

### 7. **Push-to-Talk Mode** 🎙️
Режим "нажми и говори":

```typescript
// apps/frontend/src/hooks/usePushToTalk.ts
import { useEffect, useState } from 'react';
import { LiveKitManager } from '../utils/livekit';

export function usePushToTalk(
  livekitManager: LiveKitManager | null,
  key: string = 'Space'
) {
  const [isPushing, setIsPushing] = useState(false);

  useEffect(() => {
    if (!livekitManager) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === key && !e.repeat) {
        setIsPushing(true);
        livekitManager.setMuted(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === key) {
        setIsPushing(false);
        livekitManager.setMuted(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [livekitManager, key]);

  return isPushing;
}
```

### 8. **Recording & Playback** 🎬
Запись звонков:

```typescript
// apps/frontend/src/utils/callRecorder.ts
export class CallRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  async startRecording(room: Room) {
    // Получаем все аудио треки
    const tracks: MediaStreamTrack[] = [];
    
    // Локальный трек
    const localTrack = room.localParticipant.getTrackPublication(
      Track.Source.Microphone
    );
    if (localTrack?.track) {
      tracks.push((localTrack.track as any).mediaStreamTrack);
    }

    // Удаленные треки
    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          tracks.push((publication.track as any).mediaStreamTrack);
        }
      });
    });

    // Создаем микс всех треков
    const stream = new MediaStream(tracks);
    
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.start(1000); // Записываем каждую секунду
  }

  stopRecording(): Blob {
    if (!this.mediaRecorder) throw new Error('Recording not started');

    this.mediaRecorder.stop();
    
    const blob = new Blob(this.chunks, { type: 'audio/webm' });
    this.chunks = [];
    
    return blob;
  }

  downloadRecording(blob: Blob, filename: string = 'call-recording.webm') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

---

## 🐛 Исправленные Проблемы

### 1. ✅ Иконка в трее не отображалась
**Проблема:** Electron не находил `icon.ico` в продакшене.

**Решение:**
- Обновлен путь к иконке с проверкой в `development` и `production`
- Добавлен `icon.ico` в `extraResources` в `package.json`
- Добавлена проверка существования файла с fallback

### 2. ✅ Восстановление пароля
**Добавлено:**
- Backend API: `/auth/request-password-reset` и `/auth/reset-password`
- Frontend страница: `ForgotPasswordPage.tsx`
- Email шаблон с красивым дизайном
- Валидация пароля (8+ символов, заглавные, строчные, цифры, спецсимволы)

---

## 📈 Дополнительные Улучшения

### 1. **Оптимизация LiveKit**
```typescript
// В apps/frontend/src/utils/livekit.ts
const roomOptions: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    audioPreset: {
      maxBitrate: 128_000, // 128 kbps
      priority: 'high',
    },
    dtx: true, // Discontinuous Transmission
    red: true, // Redundant Encoding
  },
  audioCaptureDefaults: {
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 48000,
    channelCount: 1,
  },
};
```

### 2. **Мониторинг Качества Звонка**
```typescript
// Добавить в CallModal
const [callQuality, setCallQuality] = useState<'excellent' | 'good' | 'poor'>('good');

useEffect(() => {
  if (!livekitManager) return;

  const interval = setInterval(async () => {
    const room = livekitManager.getRoom();
    if (!room) return;

    // Получаем статистику
    const stats = await room.localParticipant.getStats();
    
    // Анализируем качество
    // packetLoss < 1% = excellent
    // packetLoss < 5% = good
    // packetLoss >= 5% = poor
  }, 5000);

  return () => clearInterval(interval);
}, [livekitManager]);
```

### 3. **Hotkeys для Управления**
```typescript
// Глобальные горячие клавиши
Ctrl + M - Mute/Unmute
Ctrl + D - Deafen/Undeafen
Ctrl + Shift + V - Push-to-Talk toggle
Space - Push-to-Talk (hold)
Ctrl + E - End call
```

### 4. **Audio Effects**
- Voice changer (изменение голоса)
- Reverb (эхо эффект)
- Pitch shift (изменение тона)
- Robot voice
- Soundboard (звуковые эффекты)

---

## 🎯 Рекомендации

### Приоритет 1 (Критично):
1. ✅ **Иконка в трее** - Исправлено
2. ✅ **Восстановление пароля** - Добавлено
3. **Мониторинг качества звонка** - Добавить индикатор

### Приоритет 2 (Важно):
1. **Krisp AI шумоподавление** - Значительно улучшит качество
2. **Voice Activity Detection** - Лучшая детекция речи
3. **Audio Visualizer** - Улучшит UX
4. **Push-to-Talk** - Популярная функция

### Приоритет 3 (Желательно):
1. **Spatial Audio** - Крутая фича для иммерсивности
2. **Recording** - Запись звонков
3. **Audio Effects** - Развлекательные эффекты
4. **Adaptive Bitrate** - Автоматическая оптимизация

---

## 📝 Как Проверить Работу LiveKit

### Шаг 1: Проверка Backend
```bash
# Проверьте .env файл
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
LIVEKIT_URL=wss://your-livekit-server.com
```

### Шаг 2: Проверка Frontend
1. Откройте DevTools (F12)
2. Перейдите во вкладку Console
3. Начните звонок
4. Ищите логи:
```
[LiveKit] Connected to room: room-123
[LiveKit] Microphone enabled
[LiveKit] Participant connected: 456
[LiveKit] Track subscribed: audio
```

### Шаг 3: Проверка Network
1. Откройте DevTools → Network → WS (WebSocket)
2. Должно быть активное соединение к LiveKit серверу
3. Проверьте передачу данных (должны быть постоянные сообщения)

### Шаг 4: Проверка Аудио
1. Говорите в микрофон
2. Проверьте индикатор говорящего (зеленое кольцо вокруг аватара)
3. Второй пользователь должен слышать вас

---

## 🔧 Troubleshooting

### Проблема: Не слышно собеседника
**Решение:**
1. Проверьте `outputVolume` в localStorage
2. Проверьте что не включен deafen
3. Проверьте что браузер не заблокировал autoplay

### Проблема: Плохое качество звука
**Решение:**
1. Увеличьте `maxBitrate` в `publishDefaults`
2. Проверьте интернет соединение
3. Включите `red` (redundant encoding)

### Проблема: Эхо
**Решение:**
1. Убедитесь что `echoCancellation: true`
2. Используйте наушники
3. Уменьшите громкость динамиков

---

## 🎉 Заключение

Проект **Woxly** использует современный стек технологий с **LiveKit** для голосовой связи, что является правильным выбором для масштабируемого мессенджера. 

**Основные достижения:**
- ✅ Стабильная архитектура
- ✅ Качественная голосовая связь
- ✅ Electron desktop приложение
- ✅ Восстановление пароля
- ✅ Исправлена иконка в трее

**Следующие шаги:**
1. Добавить Krisp AI шумоподавление
2. Реализовать Audio Visualizer
3. Добавить Push-to-Talk режим
4. Мониторинг качества звонка

Проект готов к дальнейшему развитию! 🚀
