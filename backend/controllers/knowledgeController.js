import KnowledgeBase from '../models/KnowledgeBase.js';

// Get all knowledge base entries
export const getKnowledgeEntries = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const entries = await KnowledgeBase.find(query)
      .populate('createdBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ usageCount: -1, createdAt: -1 });

    const total = await KnowledgeBase.countDocuments(query);

    res.json({
      entries,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single knowledge entry
export const getKnowledgeEntry = async (req, res) => {
  try {
    const entry = await KnowledgeBase.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!entry) {
      return res.status(404).json({ message: 'Knowledge entry not found' });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create knowledge entry
export const createKnowledgeEntry = async (req, res) => {
  try {
    const { question, keywords, answer, category } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required' });
    }

    // Auto-generate keywords if not provided
    let autoKeywords = keywords || [];
    if (!keywords || keywords.length === 0) {
      const words = question.toLowerCase().split(/\s+/);
      autoKeywords = words.filter(word => word.length > 3);
    }

    const entry = await KnowledgeBase.create({
      question: question.toLowerCase().trim(),
      keywords: autoKeywords.map(k => k.toLowerCase().trim()),
      answer,
      category: category || 'general',
      createdBy: req.user._id
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update knowledge entry
export const updateKnowledgeEntry = async (req, res) => {
  try {
    const { question, keywords, answer, category } = req.body;

    const updateData = {};
    if (question) updateData.question = question.toLowerCase().trim();
    if (keywords) updateData.keywords = keywords.map(k => k.toLowerCase().trim());
    if (answer) updateData.answer = answer;
    if (category) updateData.category = category;

    const entry = await KnowledgeBase.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!entry) {
      return res.status(404).json({ message: 'Knowledge entry not found' });
    }

    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete knowledge entry
export const deleteKnowledgeEntry = async (req, res) => {
  try {
    const entry = await KnowledgeBase.findByIdAndDelete(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: 'Knowledge entry not found' });
    }

    res.json({ message: 'Knowledge entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


