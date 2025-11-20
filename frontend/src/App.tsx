
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CreateCourseForm from './components/CreateCourseForm';
import CourseGrid from './components/CourseGrid';
import StudySession from './components/StudySession';
import ExamView from './components/ExamView';
import ExamReview from './components/ExamReview';
import LandingPage from './components/LandingPage'; // Import Landing Page
import { AppMode, QuizQuestion, Course, ModuleData, ExamHistoryItem } from './types';
import { uploadFileToGemini, generateContentFromUri } from './services/apiService';
import { Loader2, AlertTriangle, BookOpen, GraduationCap, ArrowLeft, History, TrendingUp, Heart, Coffee } from 'lucide-react';

// Simple UUID generator
const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const App: React.FC = () => {
  // Course State (Replacing simple Library)
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  
  // App Operational State - Start at LANDING by default
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Content State for EXAM mode (Study mode handles its own state)
  const [examQuestions, setExamQuestions] = useState<QuizQuestion[] | null>(null);
  
  // State for viewing exam history
  const [activeHistoryItem, setActiveHistoryItem] = useState<ExamHistoryItem | null>(null);

  // Helper to save to storage explicitly
  const saveToStorage = (data: Course[]) => {
      try {
          localStorage.setItem('ut-pilot-courses', JSON.stringify(data));
      } catch (e) {
          console.error("Failed to save to LocalStorage", e);
      }
  };

  // Load Courses from LocalStorage on Mount
  useEffect(() => {
    const storedCourses = localStorage.getItem('ut-pilot-courses');
    if (storedCourses) {
        try {
            const parsed = JSON.parse(storedCourses);
            // Migration check: ensure all courses have modules and examHistory
            const migrated = parsed.map((c: any) => ({
                ...c,
                modules: c.modules || {},
                examHistory: (c.examHistory || []).map((h: any) => ({
                    ...h,
                    questions: h.questions || [],
                    userAnswers: h.userAnswers || []
                }))
            }));
            setCourses(migrated);
        } catch (e) {
            console.error("Failed to load courses", e);
        }
    }
    setIsStorageLoaded(true);
  }, []);

  // Auto-save effect (as backup)
  useEffect(() => {
    if (isStorageLoaded) {
        saveToStorage(courses);
    }
  }, [courses, isStorageLoaded]);

  const handleCreateCourse = async (title: string, code: string, file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const result = await uploadFileToGemini(file);
      
      const newCourse: Course = {
          id: generateId(),
          title: title,
          code: code,
          fileName: file.name,
          fileUri: result.fileUri,
          mimeType: result.mimeType,
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          modules: {}, // Initialize empty modules storage
          examHistory: [] // Initialize empty history
      };

      setCourses(prev => {
          const updated = [newCourse, ...prev];
          saveToStorage(updated); // Force save immediately
          return updated;
      });
      
      setShowCreateModal(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal mengupload file ke Google AI.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCourse = (id: string) => {
      setCourses(prev => {
          const updated = prev.filter(c => c.id !== id);
          saveToStorage(updated);
          return updated;
      });
      if (activeCourse?.id === id) {
          handleBackToHome();
      }
  };

  const handleSelectCourse = (course: Course) => {
      // Update last accessed
      const updatedCourse = { ...course, lastAccessed: Date.now() };
      
      setCourses(prev => {
          const updated = prev.map(c => c.id === course.id ? updatedCourse : c);
          saveToStorage(updated);
          return updated;
      });
      
      setActiveCourse(updatedCourse);
      setMode(AppMode.COURSE_DASHBOARD);
      setError(null);
  };

  // Function to update specific module data inside a course (Notes/Quiz)
  const handleUpdateCourseModule = useCallback((courseId: string, chapter: number, data: Partial<ModuleData>) => {
      setCourses(prevCourses => {
          const newCourses = prevCourses.map(course => {
              if (course.id === courseId) {
                  const updatedModules = { ...course.modules };
                  // Merge existing module data with new data
                  updatedModules[chapter] = {
                      ...(updatedModules[chapter] || {}),
                      ...data
                  };
                  
                  const updatedCourse = { ...course, modules: updatedModules };
                  
                  // Also update activeCourse if it matches
                  if (activeCourse?.id === courseId) {
                      setActiveCourse(updatedCourse);
                  }
                  
                  return updatedCourse;
              }
              return course;
          });
          
          // FORCE SAVE immediately to persist AI generation results
          saveToStorage(newCourses);
          return newCourses;
      });
  }, [activeCourse]);

  // Handler when Exam is finished to save history
  const handleExamComplete = (score: number, total: number, analysis: string, questions: QuizQuestion[], userAnswers: number[]) => {
      if (!activeCourse) return;

      const newHistoryItem: ExamHistoryItem = {
          id: generateId(),
          date: Date.now(),
          score: score,
          totalQuestions: total,
          analysisSummary: analysis,
          questions: questions,
          userAnswers: userAnswers
      };

      setCourses(prevCourses => {
          const newCourses = prevCourses.map(course => {
              if (course.id === activeCourse.id) {
                  const updatedCourse = {
                      ...course,
                      examHistory: [newHistoryItem, ...course.examHistory] // Add new result to top
                  };
                  setActiveCourse(updatedCourse); // Update UI
                  return updatedCourse;
              }
              return course;
          });
          saveToStorage(newCourses);
          return newCourses;
      });
  };

  const handleBackToHome = () => {
      setActiveCourse(null);
      setMode(AppMode.HOME);
      resetFeatures();
  };

  const resetFeatures = () => {
    setExamQuestions(null);
    setError(null);
    setIsGeneratingExam(false);
  };

  const startStudySession = () => {
      setMode(AppMode.STUDY_SESSION);
  };

  const startExamSimulation = async () => {
      if (!activeCourse) return;
      
      // Always regenerate to ensure fresh questions
      setExamQuestions(null); 
      setIsGeneratingExam(true);
      setError(null);
      
      try {
          const result = await generateContentFromUri(activeCourse.fileUri, activeCourse.mimeType, 'EXAM_SIMULATION');
          if (Array.isArray(result)) {
              setExamQuestions(result);
              setMode(AppMode.EXAM_SIMULATION);
          }
      } catch (e: any) {
          setError(e.message || "Gagal membuat soal ujian.");
      } finally {
          setIsGeneratingExam(false);
      }
  };

  if (!isStorageLoaded) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Only show Header if NOT in Landing Page */}
      {mode !== AppMode.LANDING && <Header resetApp={() => window.location.reload()} />}

      <main className="flex-1 relative">
        {/* Error Toast */}
        {error && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-5 max-w-lg w-full mx-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
          </div>
        )}

        {/* Exam Generation Overlay */}
        {isGeneratingExam && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-slate-800">Menyiapkan Soal Ujian Baru...</h3>
            <p className="text-slate-500">AI sedang menyusun 45 soal dari seluruh modul.</p>
          </div>
        )}

        {/* Create Course Modal */}
        {showCreateModal && (
            <CreateCourseForm 
                onSubmit={handleCreateCourse} 
                onCancel={() => setShowCreateModal(false)}
                isUploading={isUploading}
            />
        )}
        
        {/* VIEW 0: LANDING PAGE */}
        {mode === AppMode.LANDING && (
            <LandingPage onStart={() => setMode(AppMode.HOME)} />
        )}

        {/* VIEW 1: HOME (COURSE LIST) */}
        {mode === AppMode.HOME && (
            <CourseGrid 
                courses={courses}
                onSelectCourse={handleSelectCourse}
                onDeleteCourse={handleDeleteCourse}
                onAddCourse={() => setShowCreateModal(true)}
            />
        )}

        {/* VIEW 2: COURSE DASHBOARD */}
        {mode === AppMode.COURSE_DASHBOARD && activeCourse && (
            <div className="max-w-5xl mx-auto px-4 mt-10 animate-in fade-in duration-300 pb-20">
                <button 
                    onClick={handleBackToHome}
                    className="flex items-center text-slate-500 hover:text-blue-600 mb-6 transition-colors font-medium"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali ke Daftar Kelas
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Info & History */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <span className="inline-block bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg text-sm mb-3 border border-blue-200">
                                {activeCourse.code}
                            </span>
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">{activeCourse.title}</h1>
                            <p className="text-slate-500 text-sm mb-4">{activeCourse.fileName}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100 pt-4">
                                <BookOpen className="w-3 h-3" />
                                <span>{Object.keys(activeCourse.modules || {}).length} Bab Dipelajari</span>
                            </div>
                        </div>

                        {/* Exam History Widget */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                             <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <History className="w-4 h-4 text-blue-600" />
                                Riwayat Simulasi UAS
                             </h3>
                             {activeCourse.examHistory && activeCourse.examHistory.length > 0 ? (
                                 <div className="space-y-3">
                                     {activeCourse.examHistory.slice(0, 5).map((hist) => (
                                         <button
                                             key={hist.id}
                                             type="button"
                                             onClick={() => {
                                                 setActiveHistoryItem(hist);
                                                 setMode(AppMode.EXAM_REVIEW);
                                             }}
                                             className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer"
                                         >
                                             <div className="text-left">
                                                 <div className="text-xs text-slate-500">
                                                     {new Date(hist.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                 </div>
                                                 <div className={`text-sm font-bold ${hist.score >= (hist.totalQuestions * 0.8) ? 'text-green-600' : (hist.score >= (hist.totalQuestions * 0.5) ? 'text-yellow-600' : 'text-red-500')}`}>
                                                     Skor: {hist.score} / {hist.totalQuestions}
                                                 </div>
                                             </div>
                                             <TrendingUp className={`w-4 h-4 ${hist.score >= (hist.totalQuestions * 0.5) ? 'text-green-500' : 'text-slate-300'}`} />
                                         </button>
                                     ))}
                                     {activeCourse.examHistory.length > 5 && (
                                         <p className="text-xs text-center text-slate-400 mt-2">
                                             + {activeCourse.examHistory.length - 5} riwayat lainnya
                                         </p>
                                     )}
                                 </div>
                             ) : (
                                 <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                     Belum ada riwayat ujian.
                                 </div>
                             )}
                        </div>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="lg:col-span-2 grid grid-cols-1 gap-6">
                        <button 
                            onClick={startStudySession}
                            className="bg-white border border-slate-200 p-8 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all group text-left flex items-start gap-6"
                        >
                            <div className="bg-blue-50 w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <BookOpen className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">Mulai Belajar Per Modul</h3>
                                <p className="text-slate-500 leading-relaxed">
                                    Pelajari materi secara bertahap (per bab). Sistem akan membuatkan Smart Notes dan Latihan Soal untuk setiap bab yang Anda pilih.
                                </p>
                            </div>
                        </button>

                        <button 
                            onClick={startExamSimulation}
                            className="bg-white border border-slate-200 p-8 rounded-2xl hover:border-yellow-400 hover:shadow-md transition-all group text-left flex items-start gap-6 relative overflow-hidden"
                        >
                             <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                                SOAL BARU SETIAP SESI
                            </div>
                            <div className="bg-yellow-50 w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <GraduationCap className="w-8 h-8 text-yellow-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-yellow-700 transition-colors">Simulasi Ujian Akhir (UAS)</h3>
                                <p className="text-slate-500 leading-relaxed mb-4">
                                    Tes kesiapanmu dengan 45 soal acak dari seluruh materi modul. Soal akan digenerate baru oleh AI setiap kali Anda memulai sesi ini.
                                </p>
                                <div className="flex items-center gap-3 text-sm text-slate-400 bg-slate-50 px-3 py-2 rounded-lg w-fit">
                                    <span className="flex items-center gap-1"><History className="w-3 h-3" /> Soal tidak disimpan di cache</span>
                                    <span>•</span>
                                    <span>Hasil ujian disimpan di Riwayat</span>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* VIEW 3: STUDY SESSION (NOTES + QUIZ) */}
        {mode === AppMode.STUDY_SESSION && activeCourse && (
            <StudySession 
                course={activeCourse}
                initialChapter={1}
                onBack={() => setMode(AppMode.COURSE_DASHBOARD)}
                onUpdateData={handleUpdateCourseModule}
            />
        )}

        {/* VIEW 4: EXAM SIMULATION */}
        {mode === AppMode.EXAM_SIMULATION && examQuestions && (
            <div className="pt-8">
                 <ExamView 
                    questions={examQuestions}
                    onBack={() => setMode(AppMode.COURSE_DASHBOARD)}
                    onComplete={handleExamComplete}
                />
            </div>
        )}

        {/* VIEW 5: EXAM REVIEW (History) */}
        {mode === AppMode.EXAM_REVIEW && activeHistoryItem && (
            <div className="pt-8">
                <ExamReview 
                    questions={activeHistoryItem.questions}
                    userAnswers={activeHistoryItem.userAnswers}
                    score={activeHistoryItem.score}
                    date={activeHistoryItem.date}
                    analysisSummary={activeHistoryItem.analysisSummary}
                    onBack={() => setMode(AppMode.COURSE_DASHBOARD)}
                />
            </div>
        )}

      </main>
      
      <footer className="bg-white border-t border-slate-100 py-10 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-col items-center text-center gap-4">
            <div className="flex flex-col items-center gap-2">
                 <p className="text-slate-900 font-semibold text-sm">© 2025 UT-Pilot. Asisten Belajar Cerdas.</p>
                 
                 <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    Made with 
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" /> 
                    and 
                    <Coffee className="w-4 h-4 text-amber-700" /> 
                    by 
                    <a href="https://www.instagram.com/markusprap/" target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:text-blue-600 underline decoration-slate-300 hover:decoration-blue-500 transition-all">
                        Markus Prap Kurniawan
                    </a>
                 </div>
            </div>

            <a 
                href="https://teer.id/programmergenz" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-medium text-slate-500 hover:text-red-500 bg-slate-50 hover:bg-red-50 px-4 py-2 rounded-full transition-colors flex items-center gap-2 border border-slate-200 hover:border-red-200"
            >
                <Heart className="w-3 h-3" />
                Support saya untuk terus berkembang
            </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
