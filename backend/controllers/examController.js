import Exam from '../models/Exam.js';
import Student from '../models/Student.js';

export const getExams = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, classId, upcoming } = req.query;
    const query = {};

    // If student, filter by their class
    if (req.user.role === 'student') {
      const student = await Student.findOne({ email: req.user.email });
      if (student && student.class) {
        query.class = student.class;
      } else {
        return res.json({ exams: [], totalPages: 0, currentPage: 1, total: 0 });
      }
    }

    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    if (classId) {
      query.class = classId;
    }

    if (upcoming === 'true') {
      query.examDate = { $gte: new Date() };
    }

    const exams = await Exam.find(query)
      .populate('class', 'className grade section')
      .populate('createdBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ examDate: 1, startTime: 1 });

    const total = await Exam.countDocuments(query);

    res.json({
      exams,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('class')
      .populate('createdBy');

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createExam = async (req, res) => {
  try {
    const exam = await Exam.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('class');

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addPastPaper = async (req, res) => {
  try {
    const { fileName, fileUrl, year } = req.body;
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    exam.pastPapers.push({ fileName, fileUrl, year });
    await exam.save();

    res.json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deletePastPaper = async (req, res) => {
  try {
    const { paperId } = req.params;
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    exam.pastPapers = exam.pastPapers.filter(paper => paper._id.toString() !== paperId);
    await exam.save();

    res.json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


