import express from 'express';
import {
  getAttendance,
  markAttendance,
  bulkMarkAttendance,
  getAttendanceStats
} from '../controllers/attendanceController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getAttendance);
router.get('/stats', authenticate, getAttendanceStats);
router.post('/', authenticate, authorize('admin', 'teacher'), markAttendance);
router.post('/bulk', authenticate, authorize('admin', 'teacher'), bulkMarkAttendance);

export default router;


