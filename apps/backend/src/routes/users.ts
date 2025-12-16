import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateAvatar,
  updateStatus,
  changePassword,
  getUserProfile,
  updatePublicKey,
  getPublicKey,
  setup2FA,
  verify2FA,
  disable2FA,
  get2FAStatus,
} from '../controllers/users.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// Все /me роуты должны быть перед /:userId
router.get('/me', (req, res, next) => {
  console.log('Route /me matched');
  next();
}, getProfile);
router.put('/me', updateProfile);
router.post('/me/avatar', upload.single('avatar'), updateAvatar);
router.put('/me/status', updateStatus);
router.put('/me/password', changePassword);

// E2E Encryption
router.post('/me/public-key', updatePublicKey);
router.get('/:userId/public-key', getPublicKey);

// 2FA
router.get('/me/2fa/status', get2FAStatus);
router.post('/me/2fa/setup', setup2FA);
router.post('/me/2fa/verify', verify2FA);
router.post('/me/2fa/disable', disable2FA);

// Роут для получения профиля другого пользователя
router.get('/:userId', (req, res, next) => {
  console.log('Route /:userId matched', { userId: req.params.userId });
  next();
}, getUserProfile);

export default router;

