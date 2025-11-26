import React, { useState } from 'react';
import { Course } from '../types';
import { Book, MoreVertical, Trash2, Clock, ArrowRight } from 'lucide-react';
import { CustomConfirm } from './CustomModal';

interface CourseGridProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onAddCourse: () => void;
}

const CourseGrid: React.FC<CourseGridProps> = ({ courses, onSelectCourse, onDeleteCourse, onAddCourse }) => {
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; courseId: string | null; courseTitle: string }>({
    isOpen: false,
    courseId: null,
    courseTitle: ''
  });

  const handleDeleteClick = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    setConfirmState({
      isOpen: true,
      courseId: course.id,
      courseTitle: course.title
    });
  };

  const handleConfirmDelete = () => {
    if (confirmState.courseId) {
      onDeleteCourse(confirmState.courseId);
    }
    setConfirmState({ isOpen: false, courseId: null, courseTitle: '' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 mt-8 mb-20">
      <CustomConfirm
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, courseId: null, courseTitle: '' })}
        onConfirm={handleConfirmDelete}
        title="Hapus Kelas?"
        message={`Apakah Anda yakin ingin menghapus kelas "${confirmState.courseTitle}"? Semua data catatan dan riwayat kuis akan hilang permanen.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
      />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Kelas Saya</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Add Course Card */}
        <button
          onClick={onAddCourse}
          className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group bg-white/50 dark:bg-slate-800/50"
        >
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400">Buat Kelas Baru</span>
        </button>

        {/* Course Cards */}
        {courses.map((course) => (
          <div
            key={course.id}
            onClick={() => onSelectCourse(course)}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col overflow-hidden relative group"
          >
            <div className="h-2 bg-blue-600 dark:bg-blue-500 w-full"></div>
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-800">
                  {course.code}
                </span>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleDeleteClick(e, course)}
                    className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2 min-h-[3.5rem]">
                {course.title}
              </h3>

              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-6">
                <Clock className="w-3 h-3 mr-1" />
                Diakses: {new Date(course.lastAccessed || course.createdAt).toLocaleDateString('id-ID')}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center text-blue-600 dark:text-blue-400 font-semibold text-sm group-hover:gap-2 transition-all">
                Masuk Kelas <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseGrid;