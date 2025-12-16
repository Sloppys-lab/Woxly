import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Track,
  LocalParticipant,
  Participant,
  AudioPresets,
  RoomOptions,
  VideoPresets,
} from 'livekit-client';

export class LiveKitManager {
  private room: Room | null = null;
  private onRemoteStream?: (userId: string, track: RemoteTrack) => void;
  private onSpeaking?: (userId: string, isSpeaking: boolean) => void;
  private onConnectionStateChange?: (userId: string, state: string) => void;
  private onParticipantConnected?: (userId: string) => void;
  private onParticipantDisconnected?: (userId: string) => void;
  private isMuted: boolean = false;
  private isDeafened: boolean = false;
  private micVolume: number = 1.0;
  private audioContext: AudioContext | null = null;
  private volumeGainNode: GainNode | null = null;

  constructor() {
    // Инициализация
  }

  /**
   * Подключение к LiveKit комнате
   */
  async connect(url: string, token: string): Promise<void> {
    try {
      // Создаем комнату с оптимальными настройками
      const roomOptions: RoomOptions = {
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          audioPreset: AudioPresets.music, // Высокое качество аудио
          dtx: true, // Discontinuous Transmission - экономия трафика
          red: true, // Redundant encoding - надежность
        },
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      };

      this.room = new Room(roomOptions);

      // Настраиваем обработчики событий
      this.setupEventHandlers();

      // Подключаемся к комнате
      await this.room.connect(url, token);

      console.log('[LiveKit] Connected to room:', this.room.name);

      // Включаем микрофон
      await this.enableMicrophone();
    } catch (error) {
      console.error('[LiveKit] Error connecting to room:', error);
      throw error;
    }
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventHandlers(): void {
    if (!this.room) return;

    // Подключение участника
    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('[LiveKit] Participant connected:', participant.identity);
      if (this.onParticipantConnected) {
        this.onParticipantConnected(participant.identity);
      }
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(participant.identity, 'connected');
      }
    });

    // Отключение участника
    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('[LiveKit] Participant disconnected:', participant.identity);
      if (this.onParticipantDisconnected) {
        this.onParticipantDisconnected(participant.identity);
      }
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(participant.identity, 'disconnected');
      }
    });

    // Новый трек от участника
    this.room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        console.log('[LiveKit] Track subscribed:', {
          participant: participant.identity,
          kind: track.kind,
          source: track.source,
        });

        if (track.kind === Track.Kind.Audio) {
          // Применяем настройки громкости
          this.applyAudioSettings(track);

          if (this.onRemoteStream) {
            this.onRemoteStream(participant.identity, track);
          }
        }
      }
    );

    // Трек отписан
    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        console.log('[LiveKit] Track unsubscribed:', participant.identity);
      }
    );

    // Детекция речи
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      if (!this.onSpeaking) return;

      // Получаем всех участников
      const allParticipants = [
        this.room!.localParticipant,
        ...Array.from(this.room!.remoteParticipants.values()),
      ];

      // Обновляем статус говорящих
      allParticipants.forEach((participant) => {
        const isSpeaking = speakers.some((s) => s.identity === participant.identity);
        this.onSpeaking!(participant.identity, isSpeaking);
      });
    });

    // Изменение состояния подключения
    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log('[LiveKit] Connection state changed:', state);
    });

    // Переподключение
    this.room.on(RoomEvent.Reconnecting, () => {
      console.log('[LiveKit] Reconnecting...');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      console.log('[LiveKit] Reconnected!');
    });

    // Отключение
    this.room.on(RoomEvent.Disconnected, (reason?: any) => {
      console.log('[LiveKit] Disconnected:', reason);
    });
  }

  /**
   * Включение микрофона
   */
  async enableMicrophone(): Promise<void> {
    if (!this.room) return;

    try {
      const savedDeviceId = localStorage.getItem('audioInputDevice');
      const micVolume = parseFloat(localStorage.getItem('micVolume') || '1.0');

      await this.room.localParticipant.setMicrophoneEnabled(true, {
        deviceId: savedDeviceId || undefined,
      });

      console.log('[LiveKit] Microphone enabled');

      // Применяем громкость
      this.setMicrophoneVolume(micVolume);

      // Применяем состояние мута
      if (this.isMuted) {
        await this.setMuted(true);
      }
    } catch (error) {
      console.error('[LiveKit] Error enabling microphone:', error);
      throw error;
    }
  }

  /**
   * Отключение микрофона
   */
  async disableMicrophone(): Promise<void> {
    if (!this.room) return;

    try {
      await this.room.localParticipant.setMicrophoneEnabled(false);
      console.log('[LiveKit] Microphone disabled');
    } catch (error) {
      console.error('[LiveKit] Error disabling microphone:', error);
    }
  }

  /**
   * Установка громкости микрофона
   */
  setMicrophoneVolume(volume: number): void {
    this.micVolume = Math.max(0, Math.min(2, volume));
    localStorage.setItem('micVolume', this.micVolume.toString());

    if (!this.room) return;

    const audioTrack = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (audioTrack?.track) {
      // LiveKit автоматически управляет громкостью через audioTrack
      // Но мы можем применить дополнительную обработку через Web Audio API
      this.applyMicrophoneGain(audioTrack.track as any);
    }

    console.log('[LiveKit] Microphone volume set to:', this.micVolume);
  }

  /**
   * Применение усиления микрофона через Web Audio API
   */
  private applyMicrophoneGain(track: any): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 48000 });
      }

      // Получаем MediaStreamTrack
      const mediaStreamTrack = track.mediaStreamTrack;
      if (!mediaStreamTrack) return;

      const stream = new MediaStream([mediaStreamTrack]);
      const source = this.audioContext.createMediaStreamSource(stream);

      if (!this.volumeGainNode) {
        this.volumeGainNode = this.audioContext.createGain();
      }

      this.volumeGainNode.gain.value = this.micVolume;
      source.connect(this.volumeGainNode);
    } catch (error) {
      console.error('[LiveKit] Error applying microphone gain:', error);
    }
  }

  /**
   * Применение настроек громкости к удаленному треку
   */
  private applyAudioSettings(track: RemoteTrack): void {
    const outputVolume = parseFloat(localStorage.getItem('outputVolume') || '1.0');

    // Устанавливаем громкость через LiveKit API
    if ('setVolume' in track) {
      (track as any).setVolume(outputVolume);
    }

    // Применяем состояние deafen
    if (this.isDeafened) {
      if ('setVolume' in track) {
        (track as any).setVolume(0);
      }
    }
  }

  /**
   * Переключение мута
   */
  async toggleMute(): Promise<boolean> {
    this.isMuted = !this.isMuted;
    await this.setMuted(this.isMuted);
    return this.isMuted;
  }

  /**
   * Установка мута
   */
  async setMuted(muted: boolean): Promise<void> {
    this.isMuted = muted;
    localStorage.setItem('globalMicMuted', muted.toString());

    if (!this.room) return;

    try {
      await this.room.localParticipant.setMicrophoneEnabled(!muted);
      console.log('[LiveKit] Microphone muted:', muted);
    } catch (error) {
      console.error('[LiveKit] Error setting mute:', error);
    }
  }

  /**
   * Проверка мута
   */
  isMutedState(): boolean {
    return this.isMuted;
  }

  /**
   * Установка deafen (отключение звука от других)
   */
  setDeafened(deafened: boolean): void {
    this.isDeafened = deafened;
    localStorage.setItem('globalDeafened', deafened.toString());

    if (!this.room) return;

    // Отключаем звук от всех удаленных участников
    this.room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          if ('setVolume' in publication.track) {
            (publication.track as any).setVolume(deafened ? 0 : 1);
          }
        }
      });
    });

    // Если deafen включен, автоматически мутим микрофон
    if (deafened && !this.isMuted) {
      this.setMuted(true);
    }

    console.log('[LiveKit] Deafened:', deafened);
  }

  /**
   * Смена устройства ввода
   */
  async switchAudioInput(deviceId: string): Promise<void> {
    if (!this.room) return;

    try {
      await this.room.switchActiveDevice('audioinput', deviceId);
      localStorage.setItem('audioInputDevice', deviceId);
      console.log('[LiveKit] Switched audio input to:', deviceId);
    } catch (error) {
      console.error('[LiveKit] Error switching audio input:', error);
      throw error;
    }
  }

  /**
   * Получение списка участников
   */
  getParticipants(): string[] {
    if (!this.room) return [];

    const participants = [
      this.room.localParticipant.identity,
      ...Array.from(this.room.remoteParticipants.values()).map((p) => p.identity),
    ];

    return participants;
  }

  /**
   * Получение локального участника
   */
  getLocalParticipant(): LocalParticipant | null {
    return this.room?.localParticipant || null;
  }

  /**
   * Установка callback для удаленных треков
   */
  setOnRemoteStream(callback: (userId: string, track: RemoteTrack) => void): void {
    this.onRemoteStream = callback;

    // Вызываем callback для уже подключенных участников
    if (this.room) {
      this.room.remoteParticipants.forEach((participant) => {
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.track) {
            callback(participant.identity, publication.track);
          }
        });
      });
    }
  }

  /**
   * Установка callback для детекции речи
   */
  setOnSpeaking(callback: (userId: string, isSpeaking: boolean) => void): void {
    this.onSpeaking = callback;
  }

  /**
   * Установка callback для изменения состояния подключения
   */
  setOnConnectionStateChange(callback: (userId: string, state: string) => void): void {
    this.onConnectionStateChange = callback;
  }

  /**
   * Установка callback для подключения участника
   */
  setOnParticipantConnected(callback: (userId: string) => void): void {
    this.onParticipantConnected = callback;
  }

  /**
   * Установка callback для отключения участника
   */
  setOnParticipantDisconnected(callback: (userId: string) => void): void {
    this.onParticipantDisconnected = callback;
  }

  /**
   * Отключение от комнаты
   */
  async disconnect(): Promise<void> {
    if (!this.room) return;

    try {
      await this.room.disconnect();
      console.log('[LiveKit] Disconnected from room');
    } catch (error) {
      console.error('[LiveKit] Error disconnecting:', error);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Очистка ресурсов
   */
  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.volumeGainNode = null;
    this.room = null;
    this.onRemoteStream = undefined;
    this.onSpeaking = undefined;
    this.onConnectionStateChange = undefined;
    this.onParticipantConnected = undefined;
    this.onParticipantDisconnected = undefined;

    console.log('[LiveKit] Cleanup completed');
  }

  /**
   * Получение текущей комнаты
   */
  getRoom(): Room | null {
    return this.room;
  }

  /**
   * Проверка подключения
   */
  isConnected(): boolean {
    return this.room?.state === 'connected';
  }
}
