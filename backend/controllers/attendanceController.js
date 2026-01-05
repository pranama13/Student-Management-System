import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';

export const getAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 10, studentId, classId, date } = req.query;
    const query = {};

    // If student, only show their own attendance
    if (req.user.role === 'student') {
      const student = await Student.findOne({ email: req.user.email });
      if (student) {
        query.student = student._id;
        if (student.class) {
          query.class = student.class;
        }
      } else {
        return res.json({ attendance: [], totalPages: 0, currentPage: 1, total: 0 });
      }
    } else {
      if (studentId) query.student = studentId;
      if (classId) query.class = classId;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'name studentId email')
      .populate('class', 'className grade section')
      .populate('markedBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ date: -1 });

    const total = await Attendance.countDocuments(query);

    res.json({
      attendance,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const { studentId, classId, date, status, remarks } = req.body;

    // Set date to start of day for consistency
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      {
        student: studentId,
        class: classId,
        date: attendanceDate
      },
      {
        student: studentId,
        class: classId,
        date: attendanceDate,
        status,
        remarks,
        markedBy: req.user._id
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(attendance);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Attendance for this student and date already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
};

export const bulkMarkAttendance = async (req, res) => {
  try {
    const { classId, date, records } = req.body; // records: [{ studentId, status, remarks }]

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendanceRecords = records.map(record => ({
      student: record.studentId,
      class: classId,
      date: attendanceDate,
      status: record.status,
      remarks: record.remarks,
      markedBy: req.user._id
    }));

    // Use bulkWrite for better performance
    const operations = attendanceRecords.map(record => ({
      updateOne: {
        filter: {
          student: record.student,
          class: record.class,
          date: record.date
        },
        update: { $set: record },
        upsert: true
      }
    }));

    await Attendance.bulkWrite(operations);

    res.json({ message: 'Attendance marked successfully', count: records.length });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAttendanceStats = async (req, res) => {
  try {
    const { studentId, classId } = req.query;
    const query = {};

    if (studentId) query.student = studentId;
    if (classId) query.class = classId;

    const stats = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Attendance.countDocuments(query);
    const present = stats.find(s => s._id === 'present')?.count || 0;
    const absent = stats.find(s => s._id === 'absent')?.count || 0;

    res.json({
      total,
      present,
      absent,
      presentPercentage: total > 0 ? ((present / total) * 100).toFixed(2) : 0,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
