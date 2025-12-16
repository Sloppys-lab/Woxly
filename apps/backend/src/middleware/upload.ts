import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');

// Создать директорию если не существует
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены'));
    }
  },
});

// Загрузка аватара комнаты
const roomAvatarsDir = path.join(process.cwd(), 'uploads', 'room-avatars');

// Создать директорию если не существует
if (!fs.existsSync(roomAvatarsDir)) {
  fs.mkdirSync(roomAvatarsDir, { recursive: true });
}

const roomAvatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, roomAvatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `room-avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const uploadRoomAvatar = multer({
  storage: roomAvatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены'));
    }
  },
});

// Загрузка файлов сообщений (изображения, файлы, голосовые)
const messageFilesDir = path.join(process.cwd(), 'uploads', 'messages');

// Создать директорию если не существует
if (!fs.existsSync(messageFilesDir)) {
  fs.mkdirSync(messageFilesDir, { recursive: true });
}

const messageFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, messageFilesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `msg-${uniqueSuffix}${ext}`);
  },
});

export const uploadMessageFile = multer({
  storage: messageFileStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB для файлов
  },
  fileFilter: (req, file, cb) => {
    // Разрешаем изображения, аудио (для голосовых) и общие файлы
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedAudioTypes = /webm|ogg|mp3|wav|m4a/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    const isImage = allowedImageTypes.test(ext) || file.mimetype.startsWith('image/');
    const isAudio = allowedAudioTypes.test(ext) || file.mimetype.startsWith('audio/');
    const isFile = true; // Разрешаем все файлы
    
    if (isImage || isAudio || isFile) {
      return cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'));
    }
  },
});

// Загрузка голосовых сообщений
const voiceMessagesDir = path.join(process.cwd(), 'uploads', 'voice');

if (!fs.existsSync(voiceMessagesDir)) {
  fs.mkdirSync(voiceMessagesDir, { recursive: true });
}

const voiceMessageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, voiceMessagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `voice-${uniqueSuffix}.webm`);
  },
});

export const uploadVoiceMessage = multer({
  storage: voiceMessageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB для голосовых
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /webm|ogg|mp3|wav|m4a/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isAudio = allowedTypes.test(ext) || file.mimetype.startsWith('audio/');
    
    if (isAudio) {
      return cb(null, true);
    } else {
      cb(new Error('Только аудио файлы разрешены'));
    }
  },
});

