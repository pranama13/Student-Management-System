import User from '../models/User.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';

export const getPendingUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const query = { approvalStatus: 'pending' };
    if (role) query.role = role;

    const users = await User.find(query)
      .select('name email role profile approvalStatus createdAt')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.approvalStatus === 'approved') {
      return res.json({ message: 'User already approved' });
    }

    // Create corresponding Student/Teacher records if missing
    if (user.role === 'student') {
      if (!user.profile?.studentId) {
        return res.status(400).json({ message: 'Cannot approve: missing Student ID' });
      }

      const existing = await Student.findOne({
        $or: [{ email: user.email }, { studentId: user.profile.studentId }]
      }).select('_id');

      if (!existing) {
        await Student.create({
          studentId: user.profile.studentId,
          name: user.name,
          email: user.email,
          phone: user.profile?.phone
        });
      }
    } else if (user.role === 'teacher') {
      if (!user.profile?.teacherId) {
        return res.status(400).json({ message: 'Cannot approve: missing Teacher ID' });
      }

      const existing = await Teacher.findOne({
        $or: [{ email: user.email }, { teacherId: user.profile.teacherId }]
      }).select('_id');

      if (!existing) {
        await Teacher.create({
          teacherId: user.profile.teacherId,
          name: user.name,
          email: user.email,
          department: user.profile?.department,
          phone: user.profile?.phone
        });
      }
    }

    user.approvalStatus = 'approved';
    user.approvedAt = new Date();
    user.approvedBy = req.user?._id;
    await user.save();

    res.json({ message: 'User approved' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate record exists for this user (ID or email already used)' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.approvalStatus = 'rejected';
    user.approvedAt = new Date();
    user.approvedBy = req.user?._id;
    await user.save();

    res.json({ message: 'User rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


