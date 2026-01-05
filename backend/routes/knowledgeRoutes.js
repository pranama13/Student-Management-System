import express from 'express';
import {
  getKnowledgeEntries,
  getKnowledgeEntry,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry
} from '../controllers/knowledgeController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all entries (all users can view)
router.get('/', getKnowledgeEntries);

// Get single entry (all users can view)
router.get('/:id', getKnowledgeEntry);

// Create, update, delete - Admin only
router.post('/', authorize('admin'), createKnowledgeEntry);
router.put('/:id', authorize('admin'), updateKnowledgeEntry);
router.delete('/:id', authorize('admin'), deleteKnowledgeEntry);

export default router;


