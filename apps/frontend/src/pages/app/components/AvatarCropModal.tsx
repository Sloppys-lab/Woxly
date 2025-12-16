import { Modal, Button } from '@woxly/ui';
import { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface AvatarCropModalProps {
  open: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCropComplete: (croppedFile: File) => void;
}

export default function AvatarCropModal({ open, onClose, imageFile, onCropComplete }: AvatarCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgSrc = e.target?.result as string;
        setImageSrc(imgSrc);
        
        // Автоматически подбираем масштаб чтобы изображение заполнило круг
        const img = new Image();
        img.onload = () => {
          const containerSize = 400;
          const cropCircleSize = containerSize * 0.7;
          
          // Вычисляем минимальный масштаб чтобы круг был заполнен
          const minScale = Math.max(
            cropCircleSize / img.naturalWidth,
            cropCircleSize / img.naturalHeight
          );
          
          // Устанавливаем масштаб с небольшим запасом
          setScale(Math.max(1, minScale * 1.1));
          setPosition({ x: 0, y: 0 });
        };
        img.src = imgSrc;
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  // Исправляем обработку скролла для предотвращения ошибок preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prev) => Math.max(0.5, Math.min(3, prev * delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageRef.current) return;
    setIsDragging(true);
    const rect = imageRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Ограничиваем перемещение в пределах контейнера
    const maxX = rect.width / 2;
    const maxY = rect.height / 2;
    const minX = -maxX;
    const minY = -maxY;
    
    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.currentTarget === e.target || e.currentTarget.contains(e.target as Node)) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prev) => Math.max(0.5, Math.min(3, prev * delta)));
    }
  };

  const handleCrop = async () => {
    if (!imageSrc || !imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const outputSize = 400; // Размер выходного изображения (400x400)
    canvas.width = outputSize;
    canvas.height = outputSize;

    const img = new Image();
    img.onload = () => {
      // Контейнер = круг = область обрезки (всё одно и то же!)
      const containerSize = 400;
      
      // Размеры изображения на экране (в пикселях контейнера)
      // scale = 1 означает что изображение занимает 100% контейнера
      const displayWidth = containerSize * scale;
      const displayHeight = containerSize * scale;
      
      // Центр контейнера (и центр обрезки)
      const centerX = containerSize / 2;
      const centerY = containerSize / 2;
      
      // Позиция изображения (левый верхний угол) в координатах контейнера
      const imageLeft = centerX - displayWidth / 2 + position.x;
      const imageTop = centerY - displayHeight / 2 + position.y;
      
      // Область обрезки - весь контейнер (круг)
      // Верхний левый угол области обрезки = (0, 0)
      // Нужно найти какая часть изображения попадает в эту область
      
      // Координаты области обрезки относительно изображения (в пикселях display)
      const cropLeftInDisplay = -imageLeft;
      const cropTopInDisplay = -imageTop;
      
      // Соотношение: сколько пикселей исходного изображения в одном пикселе display
      const ratioX = img.naturalWidth / displayWidth;
      const ratioY = img.naturalHeight / displayHeight;
      
      // Координаты в исходном изображении
      const sourceX = cropLeftInDisplay * ratioX;
      const sourceY = cropTopInDisplay * ratioY;
      const sourceWidth = containerSize * ratioX;
      const sourceHeight = containerSize * ratioY;
      
      // Ограничиваем в пределах изображения
      const finalSourceX = Math.max(0, sourceX);
      const finalSourceY = Math.max(0, sourceY);
      const finalSourceWidth = Math.min(sourceWidth, img.naturalWidth - finalSourceX);
      const finalSourceHeight = Math.min(sourceHeight, img.naturalHeight - finalSourceY);

      // Создаем круглую маску
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.clip();

      // Рисуем обрезанное изображение
      ctx.drawImage(
        img,
        finalSourceX,
        finalSourceY,
        finalSourceWidth,
        finalSourceHeight,
        0,
        0,
        outputSize,
        outputSize
      );

      // Конвертируем в Blob и создаем File
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], imageFile?.name || 'avatar.png', { type: 'image/png' });
          onCropComplete(file);
          onClose();
        }
      }, 'image/png', 0.95); // Качество 95%
    };
    img.src = imageSrc;
  };

  if (!open || !imageSrc) return null;

  const containerSize = 400;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-lg bg-card rounded-2xl border-2 border-[#dc143c]/30 shadow-2xl animate-zoom-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dc143c]/20 p-5 bg-gradient-to-r from-[#dc143c]/20 via-[#dc143c]/10 to-transparent">
          <h2 className="text-xl font-bold text-foreground animate-fade-in">Обрезка аватара</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 p-0 rounded-full hover:bg-[#dc143c]/20 hover:text-[#dc143c] transition-all duration-300 hover:rotate-90"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Crop Area */}
        <div className="p-8 flex flex-col items-center space-y-6 bg-gradient-to-b from-background to-card/50">
          <div
            ref={containerRef}
            className="relative rounded-full overflow-hidden shadow-2xl transition-all duration-500"
            style={{
              width: containerSize,
              height: containerSize,
              cursor: isDragging ? 'grabbing' : 'grab',
              border: '3px solid #dc143c',
              boxShadow: '0 0 30px rgba(220, 20, 60, 0.6), inset 0 0 30px rgba(220, 20, 60, 0.3)',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Изображение - контейнер уже круглый, так что всё что видно = всё что будет обрезано */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop"
              className="absolute select-none"
              style={{
                width: `${100 * scale}%`,
                height: `${100 * scale}%`,
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s ease, height 0.2s ease',
                userSelect: 'none',
                pointerEvents: 'none',
                objectFit: 'cover',
              }}
              draggable={false}
            />

            {/* Вспомогательные линии */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/20 -translate-y-1/2" />
              <div className="absolute left-1/2 top-0 w-0.5 h-full bg-white/20 -translate-x-1/2" />
            </div>
          </div>

          {/* Инструкция с анимацией */}
          <div className="text-center space-y-2 animate-fade-in">
            <p className="text-sm font-medium text-foreground transition-all duration-300 hover:text-[#dc143c]">
              Перетащите изображение для позиционирования
            </p>
            <p className="text-xs text-muted-foreground transition-all duration-300">
              Используйте колесико мыши для масштабирования
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#dc143c]/20 p-5 bg-gradient-to-r from-transparent to-[#dc143c]/5">
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:bg-muted/50 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Отмена
          </Button>
          <Button
            onClick={handleCrop}
            className="bg-[#dc143c] hover:bg-[#dc143c]/90 text-white border-transparent shadow-lg hover:shadow-[#dc143c]/50 hover:scale-105 active:scale-95 transition-all duration-300 px-6"
          >
            <Check className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
            Готово
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes pulse-border {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 30px rgba(220, 20, 60, 0.6), inset 0 0 30px rgba(220, 20, 60, 0.3);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 50px rgba(220, 20, 60, 0.8), inset 0 0 50px rgba(220, 20, 60, 0.5);
          }
        }
      `}</style>
    </Modal>
  );
}

