
import React, { useState, useEffect } from 'react';
import { QuizQuestion, AppMode, Course, ModuleData } from '../types';
import { generateContentFromUri } from '../services/apiService';
import NotesView from './NotesView';
import QuizView from './QuizView';
import { Loader2, ArrowLeft, ArrowRight, BookOpen, HelpCircle } from 'lucide-react';

interface StudySessionProps {
  course: Course;
  initialChapter: number;
  onBack: () => void;
  onUpdateData: (courseId: string, chapter: number, data: Partial<ModuleData>) => void;
}

type ViewState = 'NOTES' | 'QUIZ';

const StudySession: React.FC<StudySessionProps> = ({ course, initialChapter, onBack, onUpdateData }) => {
  const [chapter, setChapter] = useState(initialChapter);
  const [viewState, setViewState] = useState<ViewState>('NOTES');
  
  // Local component state (synced from props/storage or fetched)
  const [notes, setNotes] = useState<string | null>(null);
  
  // QUESTIONS STATE
  // allQuestions: All questions available in the pool (from storage/AI)
  // activeQuestions: The 5 questions currently being quizzed
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[] | null>(null);
  
  // Loading States
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  // Load Notes: Check Local Storage (Props) first, then API
  useEffect(() => {
    const loadNotes = async () => {
      setViewState('NOTES');
      setActiveQuestions(null);
      
      // 1. Check if we already have notes for this chapter in the course object
      const existingData = course.modules[chapter];
      if (existingData && existingData.notes) {
          setNotes(existingData.notes);
          return;
      }

      // 2. If not, fetch from AI
      setIsLoadingNotes(true);
      setNotes(null); 
      try {
        const content = await generateContentFromUri(
            course.fileUri, 
            course.mimeType, 
            'STUDY_SESSION', 
            undefined, 
            chapter, 
            'NOTES'
        );
        const textContent = content as string;
        setNotes(textContent);
        
        // 3. Save back to App State (Persistent Storage)
        onUpdateData(course.id, chapter, { notes: textContent });

      } catch (error) {
        console.error(error);
        setNotes("Gagal memuat catatan. Silakan periksa koneksi internet atau file PDF Anda.");
      } finally {
        setIsLoadingNotes(false);
      }
    };

    loadNotes();
  }, [chapter, course.id]); // Only re-run if chapter changes. course.id is stable.

  // Helper to get random questions from pool
  const getRandomQuestions = (pool: QuizQuestion[], count: number = 5): QuizQuestion[] => {
      if (pool.length <= count) return pool;
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
  };

  // Handler to start quiz for current chapter
  const handleStartQuiz = async () => {
    // 1. Check if we already have the quiz POOL for this chapter
    const existingData = course.modules[chapter];
    let pool = existingData?.quiz;

    if (pool && pool.length > 0) {
        // Use existing pool, PICK NEW RANDOM SET each time this is clicked
        setActiveQuestions(getRandomQuestions(pool, 5));
        setViewState('QUIZ');
        return;
    }

    // 2. If not, fetch from AI (Fetch large batch for pooling)
    setIsLoadingQuiz(true);
    try {
      const content = await generateContentFromUri(
          course.fileUri, 
          course.mimeType, 
          'STUDY_SESSION', 
          undefined, 
          chapter, 
          'QUIZ'
      );
      const quizPool = content as QuizQuestion[];
      
      // 3. Save Pool back to App State
      onUpdateData(course.id, chapter, { quiz: quizPool });
      
      // 4. Set Active Questions
      setActiveQuestions(getRandomQuestions(quizPool, 5));
      setViewState('QUIZ');
    } catch (error) {
      console.error(error);
      alert("Gagal membuat kuis. Coba lagi nanti.");
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleNextChapter = () => {
    setChapter(prev => prev + 1);
    setActiveQuestions(null);
    setNotes(null); 
  };

  const handlePrevChapter = () => {
    if (chapter > 1) {
        setChapter(prev => prev - 1);
        setActiveQuestions(null);
        setNotes(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header for Session */}
      <div className="sticky top-16 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                title="Keluar Kelas"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h2 className="text-sm font-bold text-slate-900">Modul {chapter}</h2>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                   <span className={`flex items-center gap-1 ${viewState === 'NOTES' ? 'text-blue-600' : ''}`}>
                        <BookOpen className="w-3 h-3" /> Materi
                   </span>
                   <span>/</span>
                   <span className={`flex items-center gap-1 ${viewState === 'QUIZ' ? 'text-purple-600' : ''}`}>
                        <HelpCircle className="w-3 h-3" /> Latihan Soal
                   </span>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pb-24">
        {viewState === 'NOTES' && (
            <div className="relative">
                 <NotesView 
                    content={notes || ""} 
                    onBack={onBack} 
                    chapter={chapter}
                    onNavigateChapter={(c) => setChapter(c)} 
                    isLoading={isLoadingNotes}
                />
                
                {/* Overlay Button to Start Quiz (Only shown when notes are loaded) */}
                {!isLoadingNotes && notes && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
                            <button 
                                onClick={handlePrevChapter}
                                disabled={chapter <= 1}
                                className="text-slate-500 hover:text-slate-800 font-medium px-4 py-2 disabled:opacity-30"
                            >
                                Sebelumnya
                            </button>
                            
                            <button
                                onClick={handleStartQuiz}
                                disabled={isLoadingQuiz}
                                className="flex-1 max-w-md bg-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-purple-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isLoadingQuiz ? <Loader2 className="animate-spin" /> : <HelpCircle className="w-5 h-5" />}
                                {course.modules[chapter]?.quiz ? 'Buka Latihan Soal' : `Latihan Soal Modul ${chapter}`}
                            </button>

                            <button
                                onClick={handleNextChapter}
                                className="text-slate-500 hover:text-blue-600 font-medium px-4 py-2 flex items-center gap-2 transition-colors"
                            >
                                Selanjutnya <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {viewState === 'QUIZ' && activeQuestions && (
            <div className="pt-8">
                <QuizView 
                    key={JSON.stringify(activeQuestions[0])} // Force remount/reset when questions change
                    questions={activeQuestions}
                    onBack={() => setViewState('NOTES')} // Kembali ke materi
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default StudySession;
