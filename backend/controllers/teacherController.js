import Teacher from '../models/Teacher.js';
import User from '../models/User.js';

const findUserForTeacher = async ({ teacherId, email }) => {
  if (teacherId) {
    const byProfile = await User.findOne({ role: 'teacher', 'profile.teacherId': teacherId });
    if (byProfile) return byProfile;
  }
  if (email) {
    return await User.findOne({ role: 'teacher', email: email.toLowerCase().trim() });
  }
  return null;
};

export const getTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { teacherId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const teachers = await Teacher.find(query)
      .populate('classes', 'className grade section')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Teacher.countDocuments(query);

    res.json({
      teachers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate('classes');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createTeacher = async (req, res) => {
  try {
    const { password, ...teacherData } = req.body;

    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password is required (min 6 characters) to create teacher login' });
    }

    let user = null;
    let teacher = null;
    try {
      user = await User.create({
        name: teacherData.name,
        email: teacherData.email,
        password,
        role: 'teacher',
        profile: {
          teacherId: teacherData.teacherId,
          department: teacherData.department,
          phone: teacherData.phone
        }
      });

      teacher = await Teacher.create(teacherData);
    } catch (innerError) {
      if (teacher?._id) await Teacher.findByIdAndDelete(teacher._id);
      if (user?._id) await User.findByIdAndDelete(user._id);
      throw innerError;
    }
    res.status(201).json(teacher);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({ 
        message: `${field === 'teacherId' ? 'Teacher ID' : 'Email'} "${value}" already exists` 
      });
    }
    res.status(400).json({ message: error.message });
  }
};

export const updateTeacher = async (req, res) => {
  try {
    const { password, ...teacherData } = req.body;

    const existingTeacher = await Teacher.findById(req.params.id).select('teacherId email name phone department');
    if (!existingTeacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      teacherData,
      { new: true, runValidators: true }
    );
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Sync login user as well (best-effort)
    const user = await findUserForTeacher({
      teacherId: existingTeacher.teacherId,
      email: existingTeacher.email
    });
    if (user) {
      if (teacher.email && teacher.email !== existingTeacher.email) user.email = teacher.email;
      if (teacher.name && teacher.name !== existingTeacher.name) user.name = teacher.name;
      user.profile = {
        ...(user.profile || {}),
        teacherId: teacher.teacherId,
        department: teacher.department,
        phone: teacher.phone
      };
      if (password && String(password).length >= 6) {
        user.password = password;
      }
      await user.save();
    } else {
      // If teacher exists but login doesn't (e.g. created before auto-login feature),
      // allow admin to create login by setting a password on update.
      if (password && String(password).length >= 6) {
        await User.create({
          name: teacher.name,
          email: teacher.email,
          password,
          role: 'teacher',
          profile: {
            teacherId: teacher.teacherId,
            department: teacher.department,
            phone: teacher.phone
          }
        });
      }
    }

    res.json(teacher);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({ 
        message: `${field === 'teacherId' ? 'Teacher ID' : 'Email'} "${value}" already exists` 
      });
    }
    res.status(400).json({ message: error.message });
  }
};

export const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).select('teacherId email');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const user = await findUserForTeacher({ teacherId: teacher.teacherId, email: teacher.email });
    if (user) {
      await User.findByIdAndDelete(user._id);
    }

    await Teacher.findByIdAndDelete(req.params.id);
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
