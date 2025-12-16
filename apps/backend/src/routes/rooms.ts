import { Router } from 'express';
import {
  getRooms,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  getRoomParticipants,
  updateRoom,
  updateRoomAvatar,
  createGroupRoom,
  getLiveKitToken,
} from '../controllers/rooms.js';
import { upload, uploadRoomAvatar } from '../middleware/upload.js';

const router = Router();

router.get('/', getRooms);
router.post('/', createRoom);
router.post('/create-group', createGroupRoom); // Новый endpoint для групповых комнат
router.get('/:id', getRoom);
router.put('/:id', updateRoom);
router.post('/:id/avatar', uploadRoomAvatar.single('avatar'), updateRoomAvatar);
router.post('/:id/join', joinRoom);
router.post('/:id/leave', leaveRoom);
router.get('/:id/participants', getRoomParticipants);
router.post('/:id/livekit-token', getLiveKitToken); // Новый endpoint для LiveKit токена

export default router;

