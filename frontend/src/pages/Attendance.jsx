import { useState, useEffect } from 'react';
import { Calendar, Search } from 'lucide-react';
import api from '../services/api';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContainer';

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (user?.role !== 'student') {
      fetchClasses();
    } else {
      // For students, fetch their own attendance directly
      fetchAttendance();
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'student') {
      fetchAttendance();
    } else if (selectedClass) {
      fetchStudents();
      fetchAttendance();
    }
  }, [selectedClass, selectedDate, currentPage]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes?limit=100');
      setClasses(response.data.classes);
      if (response.data.classes.length > 0 && !selectedClass) {
        setSelectedClass(response.data.classes[0]._id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    try {
      // Important: Attendance roster should be driven by Student.class so newly
      // added students appear immediately, even if Class.students isn't synced.
      const response = await api.get(`/students?classId=${selectedClass}&limit=500&page=1`);
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let url = `/attendance?page=${currentPage}&limit=10`;
      if (user?.role === 'student') {
        // For students, fetch by date only
        url += `&date=${selectedDate}`;
      } else {
        // For admin/teacher, fetch by class and date
        if (selectedClass) {
          url += `&date=${selectedDate}&classId=${selectedClass}`;
        } else {
          setLoading(false);
          return;
        }
      }
      const response = await api.get(url);
      setAttendance(response.data.attendance);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Error loading attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (studentId, status) => {
    try {
      await api.post('/attendance', {
        studentId,
        classId: selectedClass,
        date: selectedDate,
        status
      });
      fetchAttendance();
      fetchStudents();
      toast.success('Attendance marked successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error marking attendance');
    }
  };

  const handleBulkMark = async () => {
    const records = students.map(student => {
      const existing = attendance.find(a => 
        a.student._id === student._id || a.student === student._id
      );
      return {
        studentId: student._id,
        status: existing?.status || 'absent',
        remarks: existing?.remarks || ''
      };
    });

    try {
      await api.post('/attendance/bulk', {
        classId: selectedClass,
        date: selectedDate,
        records
      });
      fetchAttendance();
      toast.success('Attendance saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error marking attendance');
    }
  };

  const getAttendanceStatus = (studentId) => {
    const record = attendance.find(a => 
      (a.student._id === studentId || a.student === studentId)
    );
    return record?.status || null;
  };

  const canMarkAttendance = user?.role === 'admin' || user?.role === 'teacher';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className={`grid grid-cols-1 ${user?.role === 'student' ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
          {user?.role !== 'student' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.className}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          {canMarkAttendance && selectedClass && (
            <div className="flex items-end">
              <Button onClick={handleBulkMark} variant="primary" className="w-full">
                Save Attendance
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Table/View */}
      {(selectedClass || user?.role === 'student') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : user?.role === 'student' ? (
            // Student view - show their own attendance records
            <div className="p-6">
              {attendance.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No attendance records found for this date.
                </div>
              ) : (
                <div className="space-y-4">
                  {attendance.map((record) => (
                    <div
                      key={record._id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Date: {new Date(record.date).toLocaleDateString()}
                          </p>
                          {record.class && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Class: {record.class.className || record.class}
                            </p>
                          )}
                          {record.remarks && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Remarks: {record.remarks}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-4 py-2 text-sm font-semibold rounded-full ${
                            record.status === 'present'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : record.status === 'late'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination for students */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Admin/Teacher view - show table with students
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Student ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      {canMarkAttendance && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={canMarkAttendance ? 4 : 3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          No students found in this class.
                        </td>
                      </tr>
                    ) : (
                      students.map((student) => {
                        const status = getAttendanceStatus(student._id);
                        return (
                          <tr key={student._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {student.studentId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {student.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {status ? (
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    status === 'present'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : status === 'late'
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}
                                >
                                  {status}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">Not marked</span>
                              )}
                            </td>
                            {canMarkAttendance && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button
                                  onClick={() => handleMarkAttendance(student._id, 'present')}
                                  className={`px-3 py-1 rounded text-xs ${
                                    status === 'present'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900'
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(student._id, 'absent')}
                                  className={`px-3 py-1 rounded text-xs ${
                                    status === 'absent'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900'
                                  }`}
                                >
                                  Absent
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(student._id, 'late')}
                                  className={`px-3 py-1 rounded text-xs ${
                                    status === 'late'
                                      ? 'bg-yellow-600 text-white'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-900'
                                  }`}
                                >
                                  Late
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination for admin/teacher */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;
