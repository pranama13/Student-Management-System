import express from 'express';
import {
  getExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  addPastPaper,
  deletePastPaper
} from '../controllers/examController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getExams);
router.get('/:id', authenticate, getExam);
router.post('/', authenticate, authorize('admin', 'teacher'), createExam);
router.put('/:id', authenticate, authorize('admin', 'teacher'), updateExam);
router.delete('/:id', authenticate, authorize('admin', 'teacher'), deleteExam);
router.post('/:id/past-papers', authenticate, authorize('admin', 'teacher'), addPastPaper);
router.delete('/:id/past-papers/:paperId', authenticate, authorize('admin', 'teacher'), deletePastPaper);

export default router;


