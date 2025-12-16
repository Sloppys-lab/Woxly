import { Router, Request, Response, NextFunction } from 'express';
import {
  getFriends,
  getFriendRequests,
  searchUsers,
  addFriend,
  acceptFriend,
  declineFriend,
  removeFriend,
  blockUser,
  updateFriendNote,
} from '../controllers/friends.js';

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  console.log('Route /friends matched');
  next();
}, getFriends);
router.get('/requests', (req: Request, res: Response, next: NextFunction) => {
  console.log('Route /friends/requests matched');
  next();
}, getFriendRequests);
router.get('/search', searchUsers);
router.post('/add', addFriend);
router.post('/accept', acceptFriend);
router.post('/decline', declineFriend);
router.post('/block', blockUser);
router.delete('/:friendId', removeFriend);
router.put('/:friendId/note', updateFriendNote);

export default router;

