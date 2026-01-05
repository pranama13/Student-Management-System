import Student from '../models/Student.js';
import Class from '../models/Class.js';
import User from '../models/User.js';

const syncStudentClassMembership = async ({ studentId, oldClassId, newClassId }) => {
  // Remove from old class (if changed)
  if (oldClassId && (!newClassId || String(oldClassId) !== String(newClassId))) {
    await Class.findByIdAndUpdate(oldClassId, { $pull: { students: studentId } });
  }

  // Add to new class
  if (newClassId) {
    await Class.findByIdAndUpdate(newClassId, { $addToSet: { students: studentId } });
  }
};

const findUserForStudent = async ({ studentId, email }) => {
  if (studentId) {
    const byProfile = await User.findOne({ role: 'student', 'profile.studentId': studentId });
    if (byProfile) return byProfile;
  }
  if (email) {
    return await User.findOne({ role: 'student', email: email.toLowerCase().trim() });
  }
  return null;
};

export const getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', classId, class: classQuery } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Support both ?classId= and ?class= for robustness
    const resolvedClassId = classId || classQuery;
    if (resolvedClassId) {
      query.class = resolvedClassId;
    }

    const students = await Student.find(query)
      .populate('class', 'className grade section')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Student.countDocuments(query);

    res.json({
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('class');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createStudent = async (req, res) => {
  try {
    const { password } = req.body;

    // Clean up request body - convert empty strings to null/undefined
    const cleanedData = { ...req.body };
    if (cleanedData.class === '' || cleanedData.class === null) {
      delete cleanedData.class;
    }
    if (cleanedData.phone === '') cleanedData.phone = undefined;
    if (cleanedData.address === '') cleanedData.address = undefined;
    if (cleanedData.dateOfBirth === '') cleanedData.dateOfBirth = undefined;

    // Password is for User login only, not Student model
    delete cleanedData.password;

    // Admin/teacher creates student => we also create the login.
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password is required (min 6 characters) to create student login' });
    }

    let user = null;
    let student = null;
    try {
      user = await User.create({
        name: cleanedData.name,
        email: cleanedData.email,
        password,
        role: 'student',
        profile: {
          studentId: cleanedData.studentId,
          phone: cleanedData.phone
        }
      });

      student = await Student.create(cleanedData);
    } catch (innerError) {
      if (student?._id) {
        if (student.class) {
          await Class.findByIdAndUpdate(student.class, { $pull: { students: student._id } });
        }
        await Student.findByIdAndDelete(student._id);
      }
      if (user?._id) {
        await User.findByIdAndDelete(user._id);
      }
      throw innerError;
    }

    // Keep Class.students in sync so Attendance (which reads Class.students) shows newly added students
    if (student.class) {
      await syncStudentClassMembership({
        studentId: student._id,
        oldClassId: null,
        newClassId: student.class
      });
    }
    res.status(201).json(student);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({ 
        message: `${field === 'studentId' ? 'Student ID' : 'Email'} "${value}" already exists` 
      });
    }
    res.status(400).json({ message: error.message });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const { password } = req.body;

    // Clean up request body - convert empty strings to null/undefined
    const cleanedData = { ...req.body };
    if (cleanedData.class === '' || cleanedData.class === null) {
      delete cleanedData.class;
    }
    if (cleanedData.phone === '') cleanedData.phone = undefined;
    if (cleanedData.address === '') cleanedData.address = undefined;
    if (cleanedData.dateOfBirth === '') cleanedData.dateOfBirth = undefined;

    // Password is for User login only, not Student model
    delete cleanedData.password;

    const existingStudent = await Student.findById(req.params.id).select('class studentId email name phone');
    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      cleanedData,
      { new: true, runValidators: true }
    );

    // Sync class membership if class changed (or removed)
    await syncStudentClassMembership({
      studentId: student._id,
      oldClassId: existingStudent.class,
      newClassId: student.class
    });

    // Sync login user as well (best-effort)
    const user = await findUserForStudent({
      studentId: existingStudent.studentId,
      email: existingStudent.email
    });
    if (user) {
      if (student.email && student.email !== existingStudent.email) user.email = student.email;
      if (student.name && student.name !== existingStudent.name) user.name = student.name;
      user.profile = {
        ...(user.profile || {}),
        studentId: student.studentId,
        phone: student.phone
      };
      if (password && String(password).length >= 6) {
        user.password = password;
      }
      await user.save();
    } else {
      // If student exists but login doesn't (e.g. created before auto-login feature),
      // allow admin to create login by setting a password on update.
      if (password && String(password).length >= 6) {
        await User.create({
          name: student.name,
          email: student.email,
          password,
          role: 'student',
          profile: {
            studentId: student.studentId,
            phone: student.phone
          }
        });
      }
    }

    res.json(student);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({ 
        message: `${field === 'studentId' ? 'Student ID' : 'Email'} "${value}" already exists` 
      });
    }
    res.status(400).json({ message: error.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('class studentId email');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Remove from class roster first (if assigned)
    if (student.class) {
      await Class.findByIdAndUpdate(student.class, { $pull: { students: student._id } });
    }

    // Delete corresponding login
    const user = await findUserForStudent({ studentId: student.studentId, email: student.email });
    if (user) {
      await User.findByIdAndDelete(user._id);
    }

    await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
