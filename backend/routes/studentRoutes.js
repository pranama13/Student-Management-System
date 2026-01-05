import express from 'express';
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent
} from '../controllers/studentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getStudents);
router.get('/:id', authenticate, getStudent);
router.post('/', authenticate, authorize('admin', 'teacher'), createStudent);
router.put('/:id', authenticate, authorize('admin', 'teacher'), updateStudent);
router.delete('/:id', authenticate, authorize('admin'), deleteStudent);

export default router;


