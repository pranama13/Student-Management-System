import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Class from '../models/Class.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import Attendance from '../models/Attendance.js';

dotenv.config();

const seedData = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI is not set in .env file');
      console.log('Please update backend/.env with your MongoDB connection string');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Drop problematic indexes before clearing data
    try {
      console.log('Cleaning up indexes...');
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      // Drop username index from users collection if it exists
      try {
        const usersCollection = db.collection('users');
        const indexes = await usersCollection.indexes();
        const usernameIndex = indexes.find(idx => idx.name === 'username_1' || idx.key?.username);
        if (usernameIndex) {
          await usersCollection.dropIndex(usernameIndex.name);
          console.log('✅ Dropped username index from users collection');
        }
      } catch (indexError) {
        // Index might not exist, which is fine
        console.log('ℹ️  No username index found (or already dropped)');
      }
    } catch (cleanupError) {
      console.log('⚠️  Index cleanup warning:', cleanupError.message);
    }

    // Clear existing data (order matters due to references)
    console.log('Clearing existing data...');
    await KnowledgeBase.deleteMany({});
    await Attendance.deleteMany({});
    await Class.deleteMany({});
    await Student.deleteMany({});
    await Teacher.deleteMany({});
    await User.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create Admin User
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@school.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log('Admin created');

    // Create Teachers
    const teacher1 = await Teacher.create({
      teacherId: 'T001',
      name: 'John Smith',
      email: 'john.smith@school.com',
      phone: '123-456-7890',
      department: 'Mathematics',
      qualification: 'M.Sc Mathematics',
      status: 'active'
    });

    const teacher2 = await Teacher.create({
      teacherId: 'T002',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@school.com',
      phone: '123-456-7891',
      department: 'Science',
      qualification: 'Ph.D Physics',
      status: 'active'
    });

    const teacherUser1 = await User.create({
      name: 'John Smith',
      email: 'john.smith@school.com',
      password: 'teacher123',
      role: 'teacher',
      profile: { teacherId: 'T001', department: 'Mathematics' }
    });

    const teacherUser2 = await User.create({
      name: 'Sarah Johnson',
      email: 'sarah.johnson@school.com',
      password: 'teacher123',
      role: 'teacher',
      profile: { teacherId: 'T002', department: 'Science' }
    });

    console.log('Teachers created');

    // Create Classes
    const class1 = await Class.create({
      className: 'Grade 10-A',
      grade: '10',
      section: 'A',
      teacher: teacher1._id,
      academicYear: '2024-2025'
    });

    const class2 = await Class.create({
      className: 'Grade 10-B',
      grade: '10',
      section: 'B',
      teacher: teacher2._id,
      academicYear: '2024-2025'
    });

    console.log('Classes created');

    // Create Students
    const students = await Student.insertMany([
      {
        studentId: 'S001',
        name: 'Alice Brown',
        email: 'alice.brown@school.com',
        phone: '123-456-7892',
        dateOfBirth: new Date('2008-05-15'),
        address: '123 Main St',
        class: class1._id,
        status: 'active'
      },
      {
        studentId: 'S002',
        name: 'Bob Wilson',
        email: 'bob.wilson@school.com',
        phone: '123-456-7893',
        dateOfBirth: new Date('2008-07-20'),
        address: '456 Oak Ave',
        class: class1._id,
        status: 'active'
      },
      {
        studentId: 'S003',
        name: 'Carol Davis',
        email: 'carol.davis@school.com',
        phone: '123-456-7894',
        dateOfBirth: new Date('2008-03-10'),
        address: '789 Pine Rd',
        class: class2._id,
        status: 'active'
      },
      {
        studentId: 'S004',
        name: 'David Miller',
        email: 'david.miller@school.com',
        phone: '123-456-7895',
        dateOfBirth: new Date('2008-09-25'),
        address: '321 Elm St',
        class: class2._id,
        status: 'active'
      }
    ]);

    // Update classes with students
    await Class.findByIdAndUpdate(class1._id, {
      students: [students[0]._id, students[1]._id]
    });
    await Class.findByIdAndUpdate(class2._id, {
      students: [students[2]._id, students[3]._id]
    });

    // Create Student Users
    await User.create({
      name: 'Alice Brown',
      email: 'alice.brown@school.com',
      password: 'student123',
      role: 'student',
      profile: { studentId: 'S001' }
    });

    await User.create({
      name: 'Bob Wilson',
      email: 'bob.wilson@school.com',
      password: 'student123',
      role: 'student',
      profile: { studentId: 'S002' }
    });

    console.log('Students created');

    // Create initial knowledge base entries for chatbot
    await KnowledgeBase.insertMany([
      {
        question: 'how to check attendance',
        keywords: ['attendance', 'check', 'view', 'see', 'my attendance'],
        answer: 'You can check your attendance by going to the Attendance page in the sidebar. Select your class and the date to view your attendance records. Teachers and admins can mark attendance for students.',
        category: 'attendance',
        createdBy: admin._id
      },
      {
        question: 'upcoming exams',
        keywords: ['exams', 'test', 'upcoming', 'schedule', 'when', 'examination', 'exam date', 'test schedule'],
        answer: 'To find information about upcoming exams, please check with your teachers or contact the administration office. Exam schedules are typically posted on the notice board or communicated by your class teacher. You can also check the dashboard for any exam announcements.',
        category: 'exams',
        createdBy: admin._id
      },
      {
        question: 'exam schedule',
        keywords: ['exam schedule', 'test dates', 'examination schedule', 'when are exams', 'exam timetable'],
        answer: 'Exam schedules are usually published before the examination period. Check with your class teacher or the administration office for the complete exam timetable. The schedule includes dates, times, and subjects for each exam.',
        category: 'exams',
        createdBy: admin._id
      },
      {
        question: 'exam results',
        keywords: ['exam results', 'test results', 'grades', 'marks', 'scores', 'my results', 'check results'],
        answer: 'Exam results are typically released after the evaluation process is complete. You can check your results by logging into the system or contacting your subject teachers. Results may also be available on the dashboard once published.',
        category: 'exams',
        createdBy: admin._id
      },
      {
        question: 'subjects',
        keywords: ['subjects', 'courses', 'classes', 'what subjects', 'my subjects', 'enrolled subjects'],
        answer: 'Your enrolled subjects can be viewed on the Classes page. This shows all the courses you are registered for this academic year. Each subject is taught by assigned teachers, and you can find more details about your class schedule there.',
        category: 'classes',
        createdBy: admin._id
      },
      {
        question: 'mathematics',
        keywords: ['mathematics', 'math', 'maths', 'mathematics class', 'math teacher'],
        answer: 'Mathematics is a core subject in the curriculum. You can find information about your mathematics class, schedule, and teacher on the Classes page. For specific questions about mathematics coursework or assignments, contact your mathematics teacher directly.',
        category: 'classes',
        createdBy: admin._id
      },
      {
        question: 'science',
        keywords: ['science', 'physics', 'chemistry', 'biology', 'science class', 'science subjects'],
        answer: 'Science subjects include Physics, Chemistry, and Biology. You can view your science classes and schedules on the Classes page. For laboratory sessions, assignments, or subject-specific inquiries, please contact your science teacher.',
        category: 'classes',
        createdBy: admin._id
      },
      {
        question: 'english',
        keywords: ['english', 'language', 'english class', 'english subject'],
        answer: 'English is a core language subject. Details about your English class, schedule, and teacher assignments are available on the Classes page. For literature, grammar, or writing assignments, contact your English teacher.',
        category: 'classes',
        createdBy: admin._id
      },
      {
        question: 'study materials',
        keywords: ['study materials', 'notes', 'resources', 'textbooks', 'assignments', 'homework'],
        answer: 'Study materials, notes, and assignments can be uploaded by teachers through the Upload Files section. Check the Upload page to access files organized by category (assignments, documents, certificates). You can also download materials shared by your teachers.',
        category: 'general',
        createdBy: admin._id
      },
      {
        question: 'assignment submission',
        keywords: ['assignment', 'submit assignment', 'how to submit', 'homework submission'],
        answer: 'To submit assignments, go to the Upload Files page. Select your assignment file, choose "Assignment" as the category, add a description if needed, and click Upload. Your teacher will be able to view and grade your submission.',
        category: 'assignments',
        createdBy: admin._id
      },
      {
        question: 'where can i see assignments',
        keywords: ['assignments', 'view assignments', 'where are assignments', 'homework', 'due date'],
        answer: 'Open the Assignments page from the sidebar. You can search by title, filter by subject, and check due dates (Due Soon/Overdue). Students see assignments for their class; teachers/admins can view more broadly.',
        category: 'assignments',
        createdBy: admin._id
      },
      {
        question: 'how to create an assignment',
        keywords: ['create assignment', 'add assignment', 'new assignment', 'teacher assignment'],
        answer: 'Teachers and admins can create assignments from the Assignments page. Click “Add Assignment”, fill in title/subject/class (optional), due date, instructions, and max marks. Save to publish it to students.',
        category: 'assignments',
        createdBy: admin._id
      },
      {
        question: 'assignment due date and overdue',
        keywords: ['due date', 'deadline', 'overdue', 'due soon', 'assignment status'],
        answer: 'Each assignment shows a due date. If the due date is near, it may show “Due Soon”; if past, it shows “Overdue”. If you believe an assignment is incorrectly marked overdue, contact your teacher/admin.',
        category: 'assignments',
        createdBy: admin._id
      },
      {
        question: 'how to view upcoming exams in the system',
        keywords: ['upcoming exams', 'view exams', 'exam list', 'exam schedule', 'upcoming'],
        answer: 'Open the Exams page from the sidebar. You can view the schedule and filter by subject. Students see exams for their class; teachers/admins can manage exams for multiple classes.',
        category: 'exams',
        createdBy: admin._id
      },
      {
        question: 'how to create an exam',
        keywords: ['create exam', 'add exam', 'new exam', 'schedule exam'],
        answer: 'Teachers and admins can create exams from the Exams page. Add subject, class (if applicable), exam date, start/end time, and any notes. Save to publish the schedule.',
        category: 'exams',
        createdBy: admin._id
      },
      {
        question: 'past papers',
        keywords: ['past papers', 'previous papers', 'old papers', 'exam papers'],
        answer: 'Past papers can be attached to an exam (teacher/admin). Open the Exams page, choose an exam, and add a past paper with file name, file URL, and year. Students can then use these for revision.',
        category: 'exams',
        createdBy: admin._id
      },
      {
        question: 'classes in this system',
        keywords: ['classes', 'class', 'grade', 'section', 'class allocation', 'class list'],
        answer: 'Classes are used to group students and to filter attendance, exams, and assignments. Students are assigned to a class by the administrator. If your class is incorrect, contact your admin/teacher.',
        category: 'classes',
        createdBy: admin._id
      },
      {
        question: 'student information',
        keywords: ['student', 'profile', 'information', 'details', 'my info'],
        answer: 'You can view your student information on the Students page. If you are a student, you will see your own profile. Teachers and admins can view all student records.',
        category: 'students',
        createdBy: admin._id
      },
      {
        question: 'teacher information',
        keywords: ['teacher', 'teachers', 'faculty', 'professor', 'instructor'],
        answer: 'You can view teacher information on the Teachers page. This page shows all registered teachers, their departments, and contact information.',
        category: 'teachers',
        createdBy: admin._id
      },
      {
        question: 'how to upload files',
        keywords: ['upload', 'file', 'document', 'assignment', 'certificate'],
        answer: 'To upload files, go to the Upload Files page in the sidebar. Select a file, choose a category (assignment, certificate, document, or other), add a description if needed, and click Upload. You can download your uploaded files anytime.',
        category: 'general',
        createdBy: admin._id
      },
      {
        question: 'contact admin',
        keywords: ['contact', 'admin', 'help', 'support', 'assistance'],
        answer: 'For administrative assistance, please contact the school administration office or send an email to admin@school.com. They will be happy to help you with any questions or concerns.',
        category: 'general',
        createdBy: admin._id
      },
      {
        question: 'class schedule',
        keywords: ['schedule', 'class', 'timetable', 'when', 'time'],
        answer: 'To view your class schedule, please check the Classes page or contact your class teacher. The schedule shows which classes you are enrolled in and their details.',
        category: 'classes',
        createdBy: admin._id
      }
    ]);
    console.log('Knowledge base entries created');

    console.log('\n✅ Seed data created successfully!');
    console.log('\n📋 Default Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👨‍💼 Admin:');
    console.log('   Email: admin@school.com');
    console.log('   Password: admin123');
    console.log('\n👨‍🏫 Teacher:');
    console.log('   Email: john.smith@school.com');
    console.log('   Password: teacher123');
    console.log('\n👨‍🎓 Student:');
    console.log('   Email: alice.brown@school.com');
    console.log('   Password: student123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding data:', error.message);
    if (error.message.includes('connect')) {
      console.error('\n💡 Tip: Make sure MongoDB is running and MONGODB_URI is correct in .env');
    }
    process.exit(1);
  }
};

seedData();
