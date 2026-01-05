import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Calendar, Clock, MapPin, FileText, Download } from 'lucide-react';
import api from '../services/api';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContainer';

const Exams = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [upcomingFilter, setUpcomingFilter] = useState('false');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPastPaperModalOpen, setIsPastPaperModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);
  const [editingExam, setEditingExam] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    examType: 'mid-term',
    subject: '',
    class: '',
    examDate: '',
    startTime: '',
    endTime: '',
    venue: '',
    instructions: ''
  });
  const [pastPaperData, setPastPaperData] = useState({
    fileName: '',
    fileUrl: '',
    year: ''
  });
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    fetchExams();
    if (user?.role !== 'student') {
      fetchClasses();
    }
  }, [currentPage, searchTerm, subjectFilter, classFilter, upcomingFilter]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: '10',
        upcoming: upcomingFilter
      });
      if (searchTerm) params.append('title', searchTerm);
      if (subjectFilter) params.append('subject', subjectFilter);
      if (classFilter) params.append('classId', classFilter);

      const response = await api.get(`/exams?${params}`);
      setExams(response.data.exams);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Error loading exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes?limit=100');
      setClasses(response.data.classes || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cleanedData = {
        ...formData,
        class: formData.class || undefined,
        examDate: formData.examDate || undefined
      };

      if (editingExam) {
        await api.put(`/exams/${editingExam._id}`, cleanedData);
      } else {
        await api.post('/exams', cleanedData);
      }
      setIsModalOpen(false);
      setEditingExam(null);
      resetForm();
      fetchExams();
      toast.success(editingExam ? 'Exam updated successfully' : 'Exam created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving exam');
    }
  };

  const handleAddPastPaper = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/exams/${selectedExam._id}/past-papers`, pastPaperData);
      setIsPastPaperModalOpen(false);
      setPastPaperData({ fileName: '', fileUrl: '', year: '' });
      fetchExams();
      toast.success('Past paper added successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error adding past paper');
    }
  };

  const handleDeletePastPaper = async (examId, paperId) => {
    try {
      await api.delete(`/exams/${examId}/past-papers/${paperId}`);
      fetchExams();
      toast.success('Past paper deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting past paper');
    }
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      examType: exam.examType,
      subject: exam.subject,
      class: exam.class?._id || exam.class || '',
      examDate: exam.examDate ? new Date(exam.examDate).toISOString().split('T')[0] : '',
      startTime: exam.startTime || '',
      endTime: exam.endTime || '',
      venue: exam.venue || '',
      instructions: exam.instructions || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setExamToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!examToDelete) return;
    try {
      await api.delete(`/exams/${examToDelete}`);
      fetchExams();
      toast.success('Exam deleted successfully');
      setExamToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting exam');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      examType: 'mid-term',
      subject: '',
      class: '',
      examDate: '',
      startTime: '',
      endTime: '',
      venue: '',
      instructions: ''
    });
  };

  const canEdit = user?.role === 'admin' || user?.role === 'teacher';
  const subjects = [...new Set(exams.map(e => e.subject))].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exams</h1>
        {canEdit && (
          <Button
            onClick={() => {
              setEditingExam(null);
              resetForm();
              setIsModalOpen(true);
            }}
            variant="primary"
          >
            <Plus size={20} className="mr-2" />
            Add Exam
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search exams..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Subjects</option>
          {subjects.map(subject => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
        {canEdit && (
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls._id} value={cls._id}>{cls.className}</option>
            ))}
          </select>
        )}
        <select
          value={upcomingFilter}
          onChange={(e) => {
            setUpcomingFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="false">All Exams</option>
          <option value="true">Upcoming Only</option>
        </select>
      </div>

      {/* Exams List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : exams.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No exams found. {canEdit && 'Create your first exam!'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {exams.map((exam) => {
              const examDate = new Date(exam.examDate);
              const isUpcoming = examDate >= new Date();
              
              return (
                <div key={exam._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {exam.title}
                        </h3>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {exam.examType}
                        </span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {exam.subject}
                        </span>
                        {isUpcoming && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar size={16} />
                          <span>{examDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock size={16} />
                          <span>{exam.startTime} - {exam.endTime}</span>
                        </div>
                        {exam.venue && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin size={16} />
                            <span>{exam.venue}</span>
                          </div>
                        )}
                        {exam.class && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Class: {exam.class.className || exam.class}
                          </div>
                        )}
                      </div>
                      {exam.instructions && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Instructions:</strong> {exam.instructions}
                        </p>
                      )}
                      
                      {/* Past Papers Section */}
                      {exam.pastPapers && exam.pastPapers.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Past Papers:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {exam.pastPapers.map((paper, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                                <a
                                  href={paper.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {paper.fileName} ({paper.year})
                                </a>
                                {canEdit && (
                                  <button
                                    onClick={() => handleDeletePastPaper(exam._id, paper._id)}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex flex-col items-center space-y-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedExam(exam);
                            setIsPastPaperModalOpen(true);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors"
                          title="Add Past Paper"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(exam)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(exam._id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
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
      </div>

      {/* Create/Edit Exam Modal */}
      {canEdit && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingExam(null);
            resetForm();
          }}
          title={editingExam ? 'Edit Exam' : 'Add Exam'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Mathematics Mid-Term Exam"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Exam Type *
              </label>
              <select
                required
                value={formData.examType}
                onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="mid-term">Mid-Term</option>
                <option value="final">Final</option>
                <option value="quiz">Quiz</option>
                <option value="test">Test</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Mathematics"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Class *
              </label>
              <select
                required
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.className} - {cls.grade} {cls.section}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Exam Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Venue
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g., Hall A, Room 101"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instructions
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Exam instructions for students..."
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingExam(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editingExam ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Past Paper Modal */}
      {canEdit && selectedExam && (
        <Modal
          isOpen={isPastPaperModalOpen}
          onClose={() => {
            setIsPastPaperModalOpen(false);
            setPastPaperData({ fileName: '', fileUrl: '', year: '' });
            setSelectedExam(null);
          }}
          title="Add Past Paper"
        >
          <form onSubmit={handleAddPastPaper} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File Name *
              </label>
              <input
                type="text"
                required
                value={pastPaperData.fileName}
                onChange={(e) => setPastPaperData({ ...pastPaperData, fileName: e.target.value })}
                placeholder="e.g., Mathematics 2023 Mid-Term"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File URL *
              </label>
              <input
                type="url"
                required
                value={pastPaperData.fileUrl}
                onChange={(e) => setPastPaperData({ ...pastPaperData, fileUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Upload file first in Upload page, then paste the URL here
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year *
              </label>
              <input
                type="text"
                required
                value={pastPaperData.year}
                onChange={(e) => setPastPaperData({ ...pastPaperData, year: e.target.value })}
                placeholder="e.g., 2023"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsPastPaperModalOpen(false);
                  setPastPaperData({ fileName: '', fileUrl: '', year: '' });
                  setSelectedExam(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Add Past Paper
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setExamToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Exam"
        message="Are you sure you want to delete this exam? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Exams;


