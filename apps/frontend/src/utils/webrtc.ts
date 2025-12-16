export class WebRTCManager {
  private peers: Map<number, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<number, MediaStream> = new Map();
  private onRemoteStream?: (userId: number, stream: MediaStream) => void;
  private onSpeaking?: (userId: number, isSpeaking: boolean) => void;
  private onConnectionStateChange?: (userId: number, state: string) => void;
  private socket: any;

  constructor(socket: any) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on('webrtc-offer', ({ from, offer }: { from: number; offer: RTCSessionDescriptionInit }) => {
      this.handleOffer(from, offer);
    });

    this.socket.on('webrtc-answer', ({ from, answer }: { from: number; answer: RTCSessionDescriptionInit }) => {
      this.handleAnswer(from, answer);
    });

    this.socket.on('ice-candidate', ({ from, candidate }: { from: number; candidate: RTCIceCandidateInit }) => {
      this.handleIceCandidate(from, candidate);
    });
  }

  async startLocalStream(deviceId?: string): Promise<MediaStream> {
    try {
      const savedDeviceId = localStorage.getItem('audioInputDevice') || deviceId;
      const noiseSuppressionEnabled = localStorage.getItem('noiseSuppression') !== 'false';
      const micVolume = parseFloat(localStorage.getItem('micVolume') || '1.0'); // Читаем громкость микрофона
      
      // Получаем базовый поток с настройками браузера
      const baseStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: savedDeviceId ? { exact: savedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: noiseSuppressionEnabled, // Применяем настройку шумоподавления
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
          // Дополнительные настройки для лучшего качества (Chrome-specific)
          ...(navigator.userAgent.includes('Chrome') && {
            googEchoCancellation: true,
            googNoiseSuppression: noiseSuppressionEnabled, // Применяем настройку
            googAutoGainControl: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
          } as any),
        },
      });

      // Применяем регулировку громкости через Web Audio API
      this.localStream = this.applyAudioProcessing(baseStream, micVolume, noiseSuppressionEnabled);

      // Детекция речи
      this.detectSpeaking(this.localStream);

      return this.localStream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  private applyAudioProcessing(stream: MediaStream, volume: number, noiseSuppression: boolean): MediaStream {
    try {
      const audioContext = new AudioContext({ sampleRate: 48000 });
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();

      // ГЛАВНАЯ РЕГУЛИРОВКА ГРОМКОСТИ МИКРОФОНА
      const volumeGain = audioContext.createGain();
      volumeGain.gain.value = volume; // Применяем громкость от 0.0 до 2.0
      
      // Сохраняем volumeGain для динамического изменения
      (this as any).volumeGainNode = volumeGain;

      if (noiseSuppression) {
        // Применяем дополнительную обработку если включено шумоподавление
        
        // Создаем фильтр для подавления низкочастотного шума
        const highpassFilter = audioContext.createBiquadFilter();
        highpassFilter.type = 'highpass';
        highpassFilter.frequency.value = 100;
        highpassFilter.Q.value = 0.7;

        // Создаем компрессор
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 6;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.1;

        // Создаем фильтр для подавления высокочастотного шума
        const lowpassFilter = audioContext.createBiquadFilter();
        lowpassFilter.type = 'lowpass';
        lowpassFilter.frequency.value = 12000;
        lowpassFilter.Q.value = 0.7;

        // Эквалайзер
        const eq1 = audioContext.createBiquadFilter();
        eq1.type = 'peaking';
        eq1.frequency.value = 2000;
        eq1.gain.value = 2;
        eq1.Q.value = 1;

        // Gate для подавления тихих звуков
        const gateGain = audioContext.createGain();
        let lastLevel = 0;
        const smoothingFactor = 0.9;
        const threshold = 0.005;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.3;

        // Подключаем: source -> volumeGain -> analyser -> highpass -> eq -> compressor -> lowpass -> gate -> destination
        source.connect(volumeGain);
        volumeGain.connect(analyser);
        analyser.connect(highpassFilter);
        highpassFilter.connect(eq1);
        eq1.connect(compressor);
        compressor.connect(lowpassFilter);
        lowpassFilter.connect(gateGain);
        gateGain.connect(destination);

        // Анализируем уровень звука
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateGate = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalizedLevel = average / 255;
          
          lastLevel = lastLevel * smoothingFactor + normalizedLevel * (1 - smoothingFactor);
          
          if (lastLevel < threshold) {
            gateGain.gain.value = Math.max(0.05, lastLevel / threshold * 0.3);
          } else {
            gateGain.gain.value = 1.0;
          }
          
          requestAnimationFrame(updateGate);
        };
        updateGate();

        (this as any).audioContext = audioContext;
        (this as any).noiseSuppressionNodes = { source, volumeGain, highpassFilter, eq1, compressor, lowpassFilter, gateGain, analyser };
      } else {
        // Без шумоподавления - только регулировка громкости
        source.connect(volumeGain);
        volumeGain.connect(destination);
        
        (this as any).audioContext = audioContext;
        (this as any).noiseSuppressionNodes = { source, volumeGain };
      }

      return destination.stream;
    } catch (error) {
      console.error('Error applying audio processing:', error);
      return stream; // Возвращаем исходный поток если обработка не удалась
    }
  }

  // Метод для динамического изменения громкости микрофона
  setMicrophoneVolume(volume: number): void {
    const volumeNode = (this as any).volumeGainNode as GainNode | undefined;
    if (volumeNode) {
      volumeNode.gain.value = Math.max(0, Math.min(2, volume)); // Ограничиваем от 0 до 2
      console.log('[WebRTC] Microphone volume set to:', volume);
    }
  }

  // Метод для переключения шумоподавления в реальном времени
  async toggleNoiseSuppression(enabled: boolean): Promise<void> {
    if (!this.localStream) return;
    
    // Сохраняем настройку
    localStorage.setItem('noiseSuppression', enabled.toString());
    
    // Перезапускаем поток с новыми настройками
    const tracks = this.localStream.getTracks();
    tracks.forEach(track => track.stop());
    
    await this.startLocalStream();
    
    // Обновляем все peer connections с новым потоком
    for (const [userId, peer] of this.peers.entries()) {
      const senders = peer.getSenders();
      const audioTrack = this.localStream.getAudioTracks()[0];
      
      const audioSender = senders.find(s => s.track?.kind === 'audio');
      if (audioSender && audioTrack) {
        await audioSender.replaceTrack(audioTrack);
      }
    }
  }

  private applyNoiseSuppression(stream: MediaStream): MediaStream {
    try {
      const audioContext = new AudioContext({ sampleRate: 48000 });
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();

      // Создаем фильтр для подавления низкочастотного шума (более мягкий)
      const highpassFilter = audioContext.createBiquadFilter();
      highpassFilter.type = 'highpass';
      highpassFilter.frequency.value = 100; // Отсекаем только очень низкие частоты
      highpassFilter.Q.value = 0.7; // Более мягкий фильтр

      // Создаем компрессор с более мягкими настройками (чтобы не было эффекта бочки)
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24; // Более высокий порог
      compressor.knee.value = 6; // Меньше колено для более плавного сжатия
      compressor.ratio.value = 4; // Меньше сжатие
      compressor.attack.value = 0.003; // Быстрая атака
      compressor.release.value = 0.1; // Быстрое освобождение

      // Создаем фильтр для подавления высокочастотного шума (более мягкий, чтобы не было эффекта бочки)
      const lowpassFilter = audioContext.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.value = 12000; // Выше частота, чтобы сохранить больше высоких частот
      lowpassFilter.Q.value = 0.7; // Более мягкий фильтр

      // Эквалайзер для улучшения качества звука
      const eq1 = audioContext.createBiquadFilter();
      eq1.type = 'peaking';
      eq1.frequency.value = 2000; // Усиливаем средние частоты для лучшей разборчивости
      eq1.gain.value = 2;
      eq1.Q.value = 1;

      // Создаем gate для подавления тихих звуков (шумоподавление) - более мягкий
      const gateGain = audioContext.createGain();
      let lastLevel = 0;
      const smoothingFactor = 0.9; // Меньше сглаживание для более быстрой реакции
      const threshold = 0.005; // Более низкий порог для лучшего шумоподавления
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512; // Больше размер для лучшего анализа
      analyser.smoothingTimeConstant = 0.3; // Меньше сглаживание

      // Подключаем цепочку: source -> analyser -> highpass -> eq -> compressor -> lowpass -> gate -> destination
      source.connect(analyser);
      analyser.connect(highpassFilter);
      highpassFilter.connect(eq1);
      eq1.connect(compressor);
      compressor.connect(lowpassFilter);
      lowpassFilter.connect(gateGain);
      gateGain.connect(destination);

      // Анализируем уровень звука и применяем gate
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateGate = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedLevel = average / 255;
        
        // Сглаживаем изменения
        lastLevel = lastLevel * smoothingFactor + normalizedLevel * (1 - smoothingFactor);
        
        // Применяем gate: если уровень ниже порога, уменьшаем громкость плавно
        if (lastLevel < threshold) {
          // Плавное уменьшение вместо резкого
          gateGain.gain.value = Math.max(0.05, lastLevel / threshold * 0.3);
        } else {
          gateGain.gain.value = 1.0;
        }
        
        requestAnimationFrame(updateGate);
      };
      updateGate();

      // Сохраняем контекст для очистки
      (this as any).audioContext = audioContext;
      (this as any).noiseSuppressionNodes = { source, highpassFilter, eq1, compressor, lowpassFilter, gateGain, analyser };

      return destination.stream;
    } catch (error) {
      console.error('Error applying noise suppression:', error);
      // В случае ошибки возвращаем исходный поток
      return stream;
    }
  }

  async createPeerConnection(userId: number, isInitiator: boolean): Promise<void> {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    };

    const peer = new RTCPeerConnection(configuration);
    
    // Улучшенные настройки для лучшего качества
    const offerOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    };

    // Добавить локальный поток
    if (this.localStream) {
      const tracks = this.localStream.getTracks();
      console.log(`Adding ${tracks.length} local tracks to peer connection for user ${userId}`, {
        trackIds: tracks.map(t => t.id),
        trackKinds: tracks.map(t => t.kind),
        trackEnabled: tracks.map(t => t.enabled)
      });
      tracks.forEach((track) => {
        peer.addTrack(track, this.localStream!);
        console.log(`Added track ${track.id} (${track.kind}) to peer connection for user ${userId}`);
      });
    } else {
      console.warn(`No local stream available when creating peer connection for user ${userId}`);
    }

    // Обработка входящего потока - обрабатываем все треки
    const remoteStreamsMap = new Map<string, MediaStream>();
    
    peer.ontrack = (event) => {
      console.log(`[WEBRTC] Received track from user ${userId}:`, {
        track: event.track,
        streams: event.streams,
        trackKind: event.track.kind,
        trackId: event.track.id,
        streamId: event.streams[0]?.id,
        trackEnabled: event.track.enabled,
        trackMuted: event.track.muted,
        trackState: event.track.readyState,
        receiver: event.receiver,
        transceiver: event.transceiver
      });
      
      // Получаем поток из события или создаем новый
      let stream = event.streams[0];
      
      if (!stream) {
        // Если потока нет в событии, создаем новый
        stream = new MediaStream();
        console.log(`[WEBRTC] Created new MediaStream for user ${userId}`);
      }
      
      // Добавляем трек в поток, если его там еще нет
      if (event.track && !stream.getTracks().includes(event.track)) {
        stream.addTrack(event.track);
        console.log(`[WEBRTC] Added track to stream for user ${userId}:`, event.track.kind, 'trackId:', event.track.id);
      }
      
      // Убеждаемся, что трек включен
      if (event.track) {
        event.track.enabled = true;
        console.log(`[WEBRTC] Track enabled for user ${userId}:`, event.track.id);
        
        // Добавляем обработчики событий трека
        event.track.onended = () => {
          console.log(`[WEBRTC] Track ended for user ${userId}:`, event.track.id);
        };
        event.track.onmute = () => {
          console.log(`[WEBRTC] Track muted for user ${userId}:`, event.track.id);
        };
        event.track.onunmute = () => {
          console.log(`[WEBRTC] Track unmuted for user ${userId}:`, event.track.id);
        };
      }
      
      // Обновляем основной поток для пользователя
      if (stream.getTracks().length > 0) {
        console.log(`[WEBRTC] Setting remote stream for user ${userId}:`, {
          tracks: stream.getTracks().length,
          trackIds: stream.getTracks().map(t => t.id),
          trackKinds: stream.getTracks().map(t => t.kind),
          trackEnabled: stream.getTracks().map(t => t.enabled),
          trackMuted: stream.getTracks().map(t => t.muted)
        });
        this.remoteStreams.set(userId, stream);
        if (this.onRemoteStream) {
          console.log(`[WEBRTC] Calling onRemoteStream callback for user ${userId}`);
          // Вызываем callback сразу, без задержки
          this.onRemoteStream(userId, stream);
        } else {
          console.warn(`[WEBRTC] onRemoteStream callback not set for user ${userId}`);
        }
      } else {
        console.warn(`[WEBRTC] No tracks in stream for user ${userId}`);
      }
    };

    // ICE кандидаты
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          to: userId,
          candidate: event.candidate,
        });
      }
    };
    
    // Отслеживание состояния соединения
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      console.log(`[WEBRTC] Connection state changed for user ${userId}:`, state);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, state);
      }
    };
    
    peer.oniceconnectionstatechange = () => {
      const state = peer.iceConnectionState;
      console.log(`[WEBRTC] ICE connection state changed for user ${userId}:`, state);
      if (state === 'failed' || state === 'disconnected') {
        // Пытаемся перезапустить ICE
        try {
          peer.restartIce();
        } catch (error) {
          console.error('Error restarting ICE:', error);
        }
      }
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, state);
      }
    };

    // Мониторинг состояния соединения
    peer.oniceconnectionstatechange = () => {
      const state = peer.iceConnectionState;
      console.log(`Connection state with ${userId}:`, state);
      
      if (state === 'failed' || state === 'disconnected') {
        console.warn(`Connection ${state} with ${userId}, attempting to restart ICE...`);
        // Пытаемся перезапустить ICE
        peer.restartIce();
      }
      
      // Уведомляем о изменении состояния
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, state);
      }
    };
    
    // Мониторинг состояния ICE
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      console.log(`Peer connection state with ${userId}:`, state);
      
      // Уведомляем о изменении состояния
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, state);
      }
      
      if (state === 'failed') {
        console.error(`Peer connection failed with ${userId}, attempting to reconnect...`);
        // Пытаемся перезапустить соединение
        try {
          peer.restartIce();
          // Если это не помогло, создаем новое соединение
          setTimeout(() => {
            if (peer.connectionState === 'failed') {
              console.log(`Recreating peer connection for user ${userId}`);
              this.peers.delete(userId);
              // Создаем новое соединение
              this.startCall(userId).catch(err => {
                console.error(`Error recreating connection for user ${userId}:`, err);
              });
            }
          }, 2000);
        } catch (error) {
          console.error(`Error restarting ICE for user ${userId}:`, error);
        }
      }
    };

    this.peers.set(userId, peer);

    if (isInitiator) {
      await this.createOffer(userId);
    }
  }

  private async createOffer(userId: number): Promise<void> {
    const peer = this.peers.get(userId);
    if (!peer) return;

    const offerOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    };
    
    const offer = await peer.createOffer(offerOptions);
    await peer.setLocalDescription(offer);

    this.socket.emit('webrtc-offer', {
      to: userId,
      offer: offer,
    });
  }

  private async handleOffer(userId: number, offer: RTCSessionDescriptionInit): Promise<void> {
    // Убеждаемся, что локальный поток готов ПЕРЕД обработкой offer
    if (!this.localStream) {
      console.log(`[WEBRTC] Starting local stream before handling offer from user ${userId}`);
      await this.startLocalStream();
      console.log(`[WEBRTC] Local stream ready for handling offer from user ${userId}`);
    } else {
      console.log(`[WEBRTC] Using existing local stream for handling offer from user ${userId}`);
    }

    let peer = this.peers.get(userId);

    if (!peer) {
      await this.createPeerConnection(userId, false);
      peer = this.peers.get(userId)!;
    }

    // Проверяем состояние перед установкой remote description
    if (peer.signalingState !== 'stable' && peer.signalingState !== 'have-local-offer') {
      console.warn(`Cannot set remote offer, signaling state is: ${peer.signalingState}`);
      // Ждем, пока состояние станет stable
      await new Promise((resolve) => {
        const checkState = () => {
          if (peer.signalingState === 'stable' || peer.signalingState === 'have-local-offer') {
            resolve(null);
          } else {
            setTimeout(checkState, 100);
          }
        };
        checkState();
      });
    }

    try {
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Remote offer set for user:', userId);
    } catch (error) {
      console.error('Error setting remote offer:', error);
      throw error;
    }

    const answerOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    };
    
    const answer = await peer.createAnswer(answerOptions);
    await peer.setLocalDescription(answer);
    console.log('Local answer created and set for user:', userId);

    this.socket.emit('webrtc-answer', {
      to: userId,
      answer: answer,
    });
  }

  private async handleAnswer(userId: number, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(userId);
    if (!peer) {
      console.warn('No peer connection found for user:', userId);
      return;
    }

    // Проверяем состояние перед установкой remote answer
    const currentState = peer.signalingState;
    console.log(`Current signaling state before setting answer: ${currentState}`);
    
    // Если соединение уже установлено (stable), игнорируем дубликат answer
    if (currentState === 'stable') {
      console.log('Connection is already stable, ignoring duplicate answer');
      return;
    }
    
    // Если состояние не подходит для установки answer, игнорируем
    if (currentState !== 'have-local-offer' && currentState !== 'have-remote-pranswer') {
      console.warn(`Cannot set remote answer, signaling state is: ${currentState}, expected: have-local-offer. Ignoring.`);
      return;
    }

    try {
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote answer set for user:', userId, 'new state:', peer.signalingState);
    } catch (error: any) {
      // Игнорируем ошибки о неправильном состоянии - это может быть дубликат
      if (error?.message?.includes('state') || error?.message?.includes('signaling')) {
        console.log('Ignoring answer due to signaling state error (likely duplicate):', error.message);
        return;
      }
      console.error('Error setting remote answer:', error);
    }
  }

  private async handleIceCandidate(userId: number, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(userId);
    if (!peer) return;

    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private detectSpeaking(stream: MediaStream): void {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    source.connect(analyser);
    analyser.fftSize = 256;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let isSpeaking = false;

    const checkLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const SPEAKING_THRESHOLD = 30;
      const currentlySpeaking = average > SPEAKING_THRESHOLD;

      if (currentlySpeaking !== isSpeaking) {
        isSpeaking = currentlySpeaking;
        if (this.onSpeaking) {
          this.onSpeaking(0, isSpeaking); // 0 = local user
        }
      }

      requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }

  setOnRemoteStream(callback: (userId: number, stream: MediaStream) => void): void {
    this.onRemoteStream = callback;
    // Если уже есть удаленные потоки, вызываем callback для них
    this.remoteStreams.forEach((stream, userId) => {
      callback(userId, stream);
    });
  }

  setOnSpeaking(callback: (userId: number, isSpeaking: boolean) => void): void {
    this.onSpeaking = callback;
  }

  setOnConnectionStateChange(callback: (userId: number, state: string) => void): void {
    this.onConnectionStateChange = callback;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  async startCall(userId: number): Promise<void> {
    // Запускаем локальный поток, если еще не запущен
    if (!this.localStream) {
      await this.startLocalStream();
    }

    // Создаем peer connection и отправляем offer
    await this.createPeerConnection(userId, true);
  }

  toggleMute(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled;
    }
    return false;
  }

  setMuted(muted: boolean): void {
    if (!this.localStream) return;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !muted;
    }
  }

  isMuted(): boolean {
    if (!this.localStream) return true;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      return !audioTrack.enabled;
    }
    return true;
  }

  cleanup(): void {
    this.stop();
  }

  stop(): void {
      // Очистить шумоподавление
      if ((this as any).audioContext) {
        const audioContext = (this as any).audioContext as AudioContext;
        const nodes = (this as any).noiseSuppressionNodes;
        if (nodes) {
          try {
            nodes.source?.disconnect();
            nodes.highpassFilter?.disconnect();
            nodes.eq1?.disconnect();
            nodes.compressor?.disconnect();
            nodes.lowpassFilter?.disconnect();
            nodes.gateGain?.disconnect();
            nodes.analyser?.disconnect();
          } catch (e) {
            // Игнорируем ошибки при отключении
          }
        }
        audioContext.close().catch(() => {});
        (this as any).audioContext = null;
        (this as any).noiseSuppressionNodes = null;
      }

    // Остановить локальный поток
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;

    // Закрыть все соединения
    this.peers.forEach((peer) => peer.close());
    this.peers.clear();
    this.remoteStreams.clear();
  }
}

