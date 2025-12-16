import { Router } from 'express';
import {
  getMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
  markAsRead,
  addReaction,
  getReactions,
  sendMessageWithFile,
  sendVoiceMessage,
  sendReplyMessage,
} from '../controllers/messages.js';
import { uploadMessageFile, uploadVoiceMessage } from '../middleware/upload.js';

const router = Router();

router.get('/', getMessages);
router.post('/', sendMessage);
router.post('/file', uploadMessageFile.single('file'), sendMessageWithFile);
router.post('/voice', uploadVoiceMessage.single('file'), sendVoiceMessage);
router.post('/reply', sendReplyMessage);
router.put('/:id', updateMessage);
router.delete('/:id', deleteMessage);
router.post('/read/:roomId', markAsRead);
router.post('/:id/reactions', addReaction);
router.get('/:id/reactions', getReactions);

export default router;

