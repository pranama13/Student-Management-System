import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getPendingUsers, approveUser, rejectUser } from '../controllers/userController.js';

const router = express.Router();

// Admin approvals
router.get('/pending', authenticate, authorize('admin'), getPendingUsers);
router.patch('/:id/approve', authenticate, authorize('admin'), approveUser);
router.patch('/:id/reject', authenticate, authorize('admin'), rejectUser);

export default router;


