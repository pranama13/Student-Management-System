import mongoose from 'mongoose';

const knowledgeBaseSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  answer: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['attendance', 'exams', 'assignments', 'students', 'teachers', 'classes', 'general'],
    default: 'general'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster search
knowledgeBaseSchema.index({ question: 'text', keywords: 'text' });

const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);

export default KnowledgeBase;


