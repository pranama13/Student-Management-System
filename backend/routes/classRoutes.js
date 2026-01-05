import express from 'express';
import {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass
} from '../controllers/classController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getClasses);
router.get('/:id', authenticate, getClass);
router.post('/', authenticate, authorize('admin'), createClass);
router.put('/:id', authenticate, authorize('admin'), updateClass);
router.delete('/:id', authenticate, authorize('admin'), deleteClass);

export default router;


