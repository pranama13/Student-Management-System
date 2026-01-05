import Assignment from '../models/Assignment.js';
import Student from '../models/Student.js';

export const getAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, classId } = req.query;
    const query = { status: { $ne: 'cancelled' } };

    // If student, filter by their class
    if (req.user.role === 'student') {
      const student = await Student.findOne({ email: req.user.email });
      if (student && student.class) {
        query.class = student.class;
      } else {
        return res.json({ assignments: [], totalPages: 0, currentPage: 1, total: 0 });
      }
    }

    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    if (classId) {
      query.class = classId;
    }

    const assignments = await Assignment.find(query)
      .populate('class', 'className grade section')
      .populate('teacher', 'name email department')
      .populate('createdBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ dueDate: 1, createdAt: -1 });

    const total = await Assignment.countDocuments(query);

    res.json({
      assignments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('class')
      .populate('teacher')
      .populate('createdBy');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json(assignment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('class').populate('teacher');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


