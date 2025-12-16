import { Modal, Button, Input, Avatar } from '@woxly/ui';
import { useState, useRef, useEffect } from 'react';
import { useRoomsStore } from '../../../store/roomsStore';
import { Upload, X } from 'lucide-react';
import axios from 'axios';
import type { Room } from '@woxly/shared';
import AvatarCropModal from './AvatarCropModal';

interface RoomSettingsModalProps {
  open: boolean;
  onClose: () => void;
  room: Room | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAvatarUrl = (avatarUrl: string | null | undefined): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${avatarUrl}`;
};

export default function RoomSettingsModal({ open, onClose, room }: RoomSettingsModalProps) {
  const { fetchRooms } = useRoomsStore();
  const [roomName, setRoomName] = useState(room?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(room?.avatarUrl || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (room) {
      setRoomName(room.name || '');
      setAvatarUrl(room.avatarUrl);
    }
  }, [room]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !room) return;

    // Показываем модальное окно обрезки
    setSelectedImageFile(file);
    setShowCropModal(true);
    
    // Сбрасываем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    if (!room) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', croppedFile);

      const response = await axios.post(`${API_URL}/rooms/${room.id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(response.data.room.avatarUrl);
      // Обновляем список комнат и активную комнату
      await fetchRooms();
      const { setActiveRoom, rooms } = useRoomsStore.getState();
      const updatedRoom = rooms.find(r => r.id === room.id) || response.data.room;
      if (setActiveRoom) {
        setActiveRoom(updatedRoom);
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Ошибка загрузки аватарки');
    } finally {
      setLoading(false);
      setShowCropModal(false);
      setSelectedImageFile(null);
    }
  };

  const handleSave = async () => {
    if (!room) return;
    setSaving(true);
    try {
      const response = await axios.put(`${API_URL}/rooms/${room.id}`, {
        name: roomName,
      });
      // Обновляем список комнат и активную комнату
      await fetchRooms();
      const { setActiveRoom, rooms } = useRoomsStore.getState();
      const updatedRoom = rooms.find(r => r.id === room.id) || response.data.room;
      if (setActiveRoom) {
        setActiveRoom(updatedRoom);
      }
      onClose();
    } catch (error: any) {
      console.error('Save room error:', error);
      alert(error.response?.data?.error || 'Ошибка сохранения настроек комнаты');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !room) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-xl font-semibold text-foreground">Настройки комнаты</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar
                src={getAvatarUrl(avatarUrl)}
                fallback={roomName[0]?.toUpperCase() || '?'}
                size="xl"
                className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleAvatarClick}
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Нажмите на аватар чтобы изменить
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAvatarClick}
                className="bg-[#dc143c]/10 border-[#dc143c]/30 hover:bg-[#dc143c]/20 text-[#dc143c]"
              >
                <Upload className="h-4 w-4 mr-2" />
                Загрузить изображение
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>

          {/* Room Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Название комнаты
            </label>
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Введите название комнаты"
              maxLength={100}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {roomName.length}/100
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border p-4">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-[#dc143c] hover:bg-[#dc143c]/90 text-white border-transparent"
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
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
    </Modal>
  );
}

