import express from 'express';
import {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment
} from '../controllers/assignmentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getAssignments);
router.get('/:id', authenticate, getAssignment);
router.post('/', authenticate, authorize('admin', 'teacher'), createAssignment);
router.put('/:id', authenticate, authorize('admin', 'teacher'), updateAssignment);
router.delete('/:id', authenticate, authorize('admin', 'teacher'), deleteAssignment);

export default router;


