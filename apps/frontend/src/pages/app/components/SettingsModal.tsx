import { Modal, Button, Input, TextArea, Slider, Avatar } from '@woxly/ui';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { UserPlus, Settings, Headphones, LogOut, Upload, Copy, Mic } from 'lucide-react';
import AvatarCropModal from './AvatarCropModal';
import axios from 'axios';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Функция для получения полного URL аватара
const getAvatarUrl = (avatarUrl: string | null | undefined): string | undefined => {
  if (!avatarUrl) return undefined;
  // Если URL уже полный (начинается с http), возвращаем как есть
  if (avatarUrl.startsWith('http')) return avatarUrl;
  // Иначе добавляем базовый URL
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${avatarUrl}`;
};

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user, updateUser, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [inputVolume, setInputVolume] = useState(100);
  const [outputVolume, setOutputVolume] = useState(100);
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);
  const [isTestingMicrophone, setIsTestingMicrophone] = useState(false);
  const [testStream, setTestStream] = useState<MediaStream | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обновляем локальные состояния при изменении user
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  // Загружаем настройки аудио из localStorage
  useEffect(() => {
    const savedInputVolume = localStorage.getItem('audioInputVolume');
    const savedOutputVolume = localStorage.getItem('audioOutputVolume');
    const savedInputDevice = localStorage.getItem('audioInputDevice');
    const savedOutputDevice = localStorage.getItem('audioOutputDevice');
    const savedNoiseSuppression = localStorage.getItem('noiseSuppression');
    if (savedInputVolume) setInputVolume(Number(savedInputVolume));
    if (savedOutputVolume) setOutputVolume(Number(savedOutputVolume));
    if (savedInputDevice) setSelectedInputDevice(savedInputDevice);
    if (savedOutputDevice) setSelectedOutputDevice(savedOutputDevice);
    if (savedNoiseSuppression !== null) {
      setNoiseSuppression(savedNoiseSuppression !== 'false');
    }
  }, []);

  // Загружаем список аудио устройств
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Запрашиваем разрешение на доступ к микрофону для получения меток устройств
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          // Игнорируем ошибку, если разрешение не дано
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(device => device.kind === 'audioinput');
        const outputs = devices.filter(device => device.kind === 'audiooutput');
        setAudioInputDevices(inputs);
        setAudioOutputDevices(outputs);
        
        // Устанавливаем первое устройство по умолчанию, если не выбрано
        if (!selectedInputDevice && inputs.length > 0) {
          setSelectedInputDevice(inputs[0].deviceId);
        }
        if (!selectedOutputDevice && outputs.length > 0) {
          setSelectedOutputDevice(outputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error loading audio devices:', error);
      }
    };

    if (activeTab === 'audio') {
      loadDevices();
    }
    
    // Обновляем список при изменении устройств
    const handleDeviceChange = () => {
      if (activeTab === 'audio') {
        loadDevices();
      }
    };
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [activeTab, selectedInputDevice, selectedOutputDevice]);

  // Сохраняем настройки аудио в localStorage
  useEffect(() => {
    // Сохраняем громкость микрофона как значение от 0 до 2 (100% = 1.0, 200% = 2.0)
    const micVolumeValue = inputVolume / 100; // Конвертируем 0-100 в 0-1.0
    localStorage.setItem('micVolume', micVolumeValue.toString());
    localStorage.setItem('audioInputVolume', inputVolume.toString()); // Для отображения в UI
    localStorage.setItem('audioOutputVolume', outputVolume.toString());
    localStorage.setItem('noiseSuppression', noiseSuppression.toString());
    if (selectedInputDevice) localStorage.setItem('audioInputDevice', selectedInputDevice);
    if (selectedOutputDevice) localStorage.setItem('audioOutputDevice', selectedOutputDevice);
    
    // Применяем громкость в реальном времени если есть активный WebRTC менеджер
    // (это для live изменений во время звонка)
    const event = new CustomEvent('micVolumeChange', { detail: { volume: micVolumeValue } });
    window.dispatchEvent(event);
  }, [inputVolume, outputVolume, selectedInputDevice, selectedOutputDevice, noiseSuppression]);

  const handleCopyId = () => {
    if (user?.woxlyId) {
      navigator.clipboard.writeText(user.woxlyId);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Показываем модальное окно обрезки
    setSelectedImageFile(file);
    setShowCropModal(true);
    
    // Сбрасываем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', croppedFile);

      const response = await axios.post(`${API_URL}/users/me/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updatedUser = response.data.user;
      updateUser({ avatarUrl: updatedUser.avatarUrl });
      setAvatarUrl(updatedUser.avatarUrl);
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Ошибка загрузки аватара');
    } finally {
      setLoading(false);
      setShowCropModal(false);
      setSelectedImageFile(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API_URL}/users/me`, {
        username,
        bio,
      });

      updateUser(response.data.user);
      onClose();
    } catch (error: any) {
      console.error('Save profile error:', error);
      alert(error.response?.data?.error || 'Ошибка сохранения профиля');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    window.location.href = '/auth/login';
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Заполните все поля');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }

    setChangingPassword(true);
    try {
      await axios.put(`${API_URL}/users/me/password`, {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      alert('Пароль успешно изменен');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Change password error:', error);
      alert(error.response?.data?.error || 'Ошибка изменения пароля');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleTestMicrophone = async () => {
    if (isTestingMicrophone) {
      // Останавливаем тест
      if (testStream) {
        testStream.getTracks().forEach(track => track.stop());
        setTestStream(null);
      }
      if (testAudioRef.current) {
        testAudioRef.current.srcObject = null;
      }
      setIsTestingMicrophone(false);
      return;
    }

    setIsTestingMicrophone(true);
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedInputDevice ? { exact: selectedInputDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setTestStream(stream);
      
      // Воспроизводим локальный поток для прослушивания своего голоса
      if (!testAudioRef.current) {
        testAudioRef.current = document.createElement('audio');
        testAudioRef.current.setAttribute('playsinline', 'true');
        testAudioRef.current.setAttribute('crossorigin', 'anonymous');
        testAudioRef.current.style.display = 'none';
        testAudioRef.current.volume = 0.5; // 50% громкости
        testAudioRef.current.muted = false;
        document.body.appendChild(testAudioRef.current);
      }
      
      // Создаем MediaStream для воспроизведения через Web Audio API
      const playbackAudioContext = new AudioContext();
      const source = playbackAudioContext.createMediaStreamSource(stream);
      const destination = playbackAudioContext.createMediaStreamDestination();
      source.connect(destination);
      
      // Используем destination stream для воспроизведения
      testAudioRef.current.srcObject = destination.stream;
      
      // Пробуем воспроизвести
      try {
        await testAudioRef.current.play();
        console.log('Test microphone audio playing');
      } catch (error: any) {
        console.error('Error playing test audio:', error);
        // Если ошибка автоплея, пробуем после взаимодействия
        if (error.name === 'NotAllowedError') {
          const playOnInteraction = () => {
            testAudioRef.current?.play().catch(err => {
              console.error('Retry failed:', err);
            });
            document.removeEventListener('click', playOnInteraction);
            document.removeEventListener('touchstart', playOnInteraction);
          };
          document.addEventListener('click', playOnInteraction, { once: true });
          document.addEventListener('touchstart', playOnInteraction, { once: true });
        }
      }
      
      // Создаем визуализацию звука
      const visualizationAudioContext = new AudioContext();
      const analyser = visualizationAudioContext.createAnalyser();
      const microphone = visualizationAudioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let animationFrameId: number;
      const checkAudio = () => {
        if (!isTestingMicrophone) {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        
        // Обновляем визуализацию
        const indicator = document.querySelector('.microphone-indicator') as HTMLElement;
        if (indicator) {
          const width = Math.min(100, (average / 255) * 100);
          indicator.style.width = `${width}%`;
        }
        
        animationFrameId = requestAnimationFrame(checkAudio);
      };
      
      checkAudio();
      
      // Автоматически останавливаем через 10 секунд
      setTimeout(() => {
        if (testStream) {
          testStream.getTracks().forEach(track => track.stop());
          setTestStream(null);
        }
        if (testAudioRef.current) {
          testAudioRef.current.srcObject = null;
        }
        setIsTestingMicrophone(false);
      }, 10000);
    } catch (error) {
      console.error('Error testing microphone:', error);
      alert('Ошибка доступа к микрофону');
      setIsTestingMicrophone(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl h-[50vh] max-h-[600px] rounded-2xl border-2 border-destructive/20 bg-background backdrop-blur-md shadow-2xl flex flex-col animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-xl font-semibold text-foreground">Настройки</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <span className="text-xl">×</span>
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar Navigation */}
          <div className="w-64 border-r border-border bg-background flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Настройки</h3>
            </div>
            <div className="flex-1 p-2 space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                  activeTab === 'profile'
                    ? 'text-white shadow-lg'
                    : 'text-[#666666] hover:text-white hover:bg-[#151719]'
                }`}
                style={activeTab === 'profile' ? {
                  background: 'rgba(220, 20, 60, 0.2)',
                  border: '1px solid rgba(220, 20, 60, 0.3)',
                } : {}}
              >
                <UserPlus className="h-5 w-5 transition-transform duration-300" />
                <span>Профиль</span>
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                  activeTab === 'account'
                    ? 'text-white shadow-lg'
                    : 'text-[#666666] hover:text-white hover:bg-[#151719]'
                }`}
                style={activeTab === 'account' ? {
                  background: 'rgba(220, 20, 60, 0.2)',
                  border: '1px solid rgba(220, 20, 60, 0.3)',
                } : {}}
              >
                <Settings className="h-5 w-5 transition-transform duration-300" />
                <span>Аккаунт</span>
              </button>
              <button
                onClick={() => setActiveTab('audio')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                  activeTab === 'audio'
                    ? 'text-white shadow-lg'
                    : 'text-[#666666] hover:text-white hover:bg-[#151719]'
                }`}
                style={activeTab === 'audio' ? {
                  background: 'rgba(220, 20, 60, 0.2)',
                  border: '1px solid rgba(220, 20, 60, 0.3)',
                } : {}}
              >
                <Headphones className="h-5 w-5 transition-transform duration-300" />
                <span>Аудио</span>
              </button>
            </div>
            <div className="p-2 border-t border-border">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#dc143c] hover:bg-[#151719] hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Выйти</span>
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-slide-in-bottom-2">
                <h3 className="text-xl font-semibold text-foreground mb-4">Профиль</h3>
                
                {/* Avatar Section */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar
                      src={getAvatarUrl(avatarUrl)}
                      fallback={user?.username?.[0]?.toUpperCase() || 'U'}
                      size="xl"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={handleAvatarClick}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Нажмите на аватар чтобы изменить
                    </p>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={handleAvatarClick}
                      disabled={loading}
                      className="bg-[#dc143c] hover:bg-[#dc143c]/90 text-white"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {loading ? 'Загрузка...' : 'Загрузить изображение'}
                    </Button>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Ник
                  </label>
                  <div className="relative">
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={13}
                      placeholder="Русские, английские буквы, цифры, . _"
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {username.length}/13
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Должен быть уникальным
                  </p>
                </div>

                {/* User ID */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    ID пользователя
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={user?.woxlyId || ''}
                      disabled
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={handleCopyId}>
                      <Copy className="h-4 w-4 mr-2" />
                      Копировать
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ID выдается автоматически и не может быть изменен
                  </p>
                </div>

                {/* Убрали "О себе" */}
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6 animate-slide-in-bottom-2">
                <h3 className="text-xl font-semibold text-foreground mb-4">Аккаунт</h3>
                
                {/* Email Section */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Email
                  </label>
                  <div className="flex items-center gap-2">
                    <Input type="email" value={user?.email || ''} disabled className="flex-1" />
                    <Button variant="outline" size="sm" disabled>
                      Изменить
                    </Button>
                  </div>
                </div>

                {/* WOXLY ID Section */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    WOXLY ID
                  </label>
                  <Input value={user?.woxlyId || ''} disabled />
                </div>

                {/* Change Password Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-lg font-semibold text-foreground">Изменить пароль</h4>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Текущий пароль
                    </label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Введите текущий пароль"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Новый пароль
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Введите новый пароль"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Подтвердите новый пароль
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Повторите новый пароль"
                    />
                  </div>

                  <Button
                    variant="default"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="bg-[#dc143c] hover:bg-[#dc143c]/90 text-white"
                  >
                    {changingPassword ? 'Изменение...' : 'Изменить пароль'}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="space-y-6 animate-slide-in-bottom-2">
                <h3 className="text-xl font-semibold text-foreground mb-4">Аудио</h3>
                
                {/* Microphone Selection */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className="h-5 w-5 text-foreground" />
                    <label className="text-sm font-medium text-foreground">
                      Микрофон
                    </label>
                  </div>
                  <select
                    value={selectedInputDevice}
                    onChange={(e) => setSelectedInputDevice(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#dc143c]/50"
                  >
                    {audioInputDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Микрофон ${audioInputDevices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Microphone Volume */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-foreground">
                      Громкость микрофона
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={inputVolume}
                      onValueChange={setInputVolume}
                      min={0}
                      max={100}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                      {inputVolume}%
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestMicrophone}
                    className={`mt-2 ${isTestingMicrophone ? 'bg-[#dc143c]/20 border-[#dc143c]/50' : ''}`}
                  >
                    {isTestingMicrophone ? 'Остановить тест' : 'Тест микрофона'}
                  </Button>
                  {isTestingMicrophone && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="microphone-indicator h-full bg-[#dc143c] transition-all duration-100" style={{ width: '0%' }} />
                      </div>
                      <span className="text-xs text-muted-foreground">Говорите...</span>
                    </div>
                  )}
                </div>

                {/* Headphones Selection */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones className="h-5 w-5 text-foreground" />
                    <label className="text-sm font-medium text-foreground">
                      Наушники
                    </label>
                  </div>
                  <select
                    value={selectedOutputDevice}
                    onChange={(e) => {
                      setSelectedOutputDevice(e.target.value);
                      // Применяем выбор устройства к аудио элементам
                      if (typeof window !== 'undefined' && 'HTMLAudioElement' in window) {
                        const audioElements = document.querySelectorAll('audio');
                        audioElements.forEach((audio) => {
                          if (audio.setSinkId) {
                            audio.setSinkId(e.target.value).catch(console.error);
                          }
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#dc143c]/50"
                  >
                    {audioOutputDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Наушники ${audioOutputDevices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sound Volume */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-foreground">
                      Громкость звука
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={outputVolume}
                      onValueChange={setOutputVolume}
                      min={0}
                      max={100}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                      {outputVolume}%
                    </span>
                  </div>
                </div>

                {/* Noise Suppression */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-foreground">
                        Шумоподавление
                      </label>
                    </div>
                    <button
                      onClick={() => setNoiseSuppression(!noiseSuppression)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#dc143c]/50 focus:ring-offset-2 ${
                        noiseSuppression ? 'bg-[#dc143c]' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          noiseSuppression ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Улучшает качество звука, подавляя фоновые шумы
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving || changingPassword}>
            Отмена
          </Button>
          {activeTab === 'profile' && (
            <Button variant="default" onClick={handleSave} disabled={saving} className="bg-[#dc143c] hover:bg-[#dc143c]/90 text-white">
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          )}
          {(activeTab === 'account' || activeTab === 'audio') && (
            <Button variant="default" onClick={onClose} disabled={saving || changingPassword} className="bg-[#dc143c] hover:bg-[#dc143c]/90 text-white">
              Сохранить изменения
            </Button>
          )}
        </div>
      </div>

      {/* Avatar Crop Modal */}
      <AvatarCropModal
        open={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setSelectedImageFile(null);
        }}
        imageFile={selectedImageFile}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

