import { Router } from 'express';
import { adminLogin, adminRefresh } from '../controllers/adminAuth.js';

const router = Router();

router.post('/login', adminLogin);
router.post('/refresh', adminRefresh);

export default router;

