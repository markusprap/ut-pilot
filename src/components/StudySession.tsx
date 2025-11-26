
import React, { useState, useEffect } from 'react';
import { QuizQuestion, AppMode, Course, ModuleData } from '../types';
import { generateContentFromUri, NoteComplexity } from '../services/geminiService';
import NotesView from './NotesView';
import QuizView from './QuizView';
import PdfViewer from './PdfViewer';
import ChatWidget from './ChatWidget';
import { Loader2, ArrowLeft, ArrowRight, BookOpen, HelpCircle, FileText } from 'lucide-react';
import { CustomAlert } from './CustomModal';

interface StudySessionProps {
  course: Course;
  initialChapter: number;
  initialView?: 'NOTES' | 'QUIZ' | 'READER';
  onBack: () => void;
  onUpdateData: (courseId: string, chapter: number, data: Partial<ModuleData>) => void;
  onUpdateUserNotes?: (courseId: string, notes: string) => void;
  pdfUrl: string | null;
  userName?: string;
}

type ViewState = 'NOTES' | 'QUIZ' | 'READER';

const StudySession: React.FC<StudySessionProps> = ({ course, initialChapter, initialView = 'NOTES', onBack, onUpdateData, onUpdateUserNotes, pdfUrl, userName = "Mahasiswa" }) => {
  const [chapter, setChapter] = useState(initialChapter);
  const [viewState, setViewState] = useState<ViewState>(initialView);
  const [noteComplexity, setNoteComplexity] = useState<NoteComplexity>('NORMAL');
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'info' | 'success' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // Local component state (synced from props/storage or fetched)
  const [notes, setNotes] = useState<string | null>(null);

  // QUESTIONS STATE
  // allQuestions: All questions available in the pool (from storage/AI)
  // activeQuestions: The questions currently being quizzed
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[] | null>(null);

  // Loading States
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  // Load Notes: Check Local Storage (Props) first, then API
  useEffect(() => {
    // Only fetch notes if we are in NOTES mode to save tokens/bandwidth
    if (viewState !== 'NOTES') return;

    const loadNotes = async () => {

      // 1. Check if we already have notes for this chapter AND complexity in the course object
      const existingData = course.modules[chapter];
      let existingNoteContent: string | undefined;

      if (existingData) {
        if (noteComplexity === 'NORMAL') existingNoteContent = existingData.notes;
        else if (noteComplexity === 'EASY') existingNoteContent = existingData.notesEasy;
        else if (noteComplexity === 'VERY_EASY') existingNoteContent = existingData.notesVeryEasy;
      }

      if (existingNoteContent) {
        setNotes(existingNoteContent);
        return;
      }

      // 2. If not, fetch from AI
      setIsLoadingNotes(true);
      setNotes(null);
      try {
        const content = await generateContentFromUri(
          course.fileUri,
          course.mimeType,
          AppMode.STUDY_SESSION,
          userName,
          undefined,
          chapter,
          'NOTES',
          noteComplexity // Pass complexity
        );
        const textContent = content as string;
        setNotes(textContent);

        // 3. Save back to App State (Persistent Storage) based on Complexity
        let dataToUpdate: Partial<ModuleData> = {};
        if (noteComplexity === 'NORMAL') dataToUpdate = { notes: textContent };
        else if (noteComplexity === 'EASY') dataToUpdate = { notesEasy: textContent };
        else if (noteComplexity === 'VERY_EASY') dataToUpdate = { notesVeryEasy: textContent };

        onUpdateData(course.id, chapter, dataToUpdate);

      } catch (error) {
        console.error(error);
        setNotes("Gagal memuat catatan. Silakan periksa koneksi internet atau file PDF Anda.");
      } finally {
        setIsLoadingNotes(false);
      }
    };

    loadNotes();
  }, [chapter, course.id, viewState, noteComplexity]); // Trigger when chapter, viewState OR complexity changes

  // Helper to get random questions from pool
  const getRandomQuestions = (pool: QuizQuestion[], count: number = 10): QuizQuestion[] => {
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
      setActiveQuestions(getRandomQuestions(pool, 10));
      setViewState('QUIZ');
      return;
    }

    // 2. If not, fetch from AI (Fetch large batch for pooling)
    setIsLoadingQuiz(true);
    try {
      const content = await generateContentFromUri(
        course.fileUri,
        course.mimeType,
        AppMode.STUDY_SESSION,
        userName,
        undefined,
        chapter,
        'QUIZ'
      );
      const quizPool = content as QuizQuestion[];

      // 3. Save Pool back to App State
      onUpdateData(course.id, chapter, { quiz: quizPool });

      // 4. Set Active Questions
      setActiveQuestions(getRandomQuestions(quizPool, 10));
      setViewState('QUIZ');
    } catch (error) {
      console.error(error);
      setAlertState({
        isOpen: true,
        title: 'Gagal Membuat Kuis',
        message: 'Maaf, terjadi kesalahan saat membuat kuis. Silakan coba lagi nanti.',
        type: 'error'
      });
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleNextChapter = () => {
    setChapter(prev => prev + 1);
    setActiveQuestions(null);
    setNotes(null);
    // Note complexity remains preferred setting
  };

  const handlePrevChapter = () => {
    if (chapter > 1) {
      setChapter(prev => prev - 1);
      setActiveQuestions(null);
      setNotes(null);
    }
  };

  const handleSaveNotes = (notes: string) => {
    if (onUpdateUserNotes) {
      onUpdateUserNotes(course.id, notes);
    }
  }

  // Get current notes context for ChatWidget
  // We try to get the currently visible notes first
  const currentChapterNotes = notes || course.modules[chapter]?.notes || "";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <CustomAlert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

      {/* Sticky Header for Session */}
      <div className="sticky top-16 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm transition-colors duration-300">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Modul {chapter}</h2>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="hidden sm:inline">Navigasi:</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setViewState('NOTES')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${viewState === 'NOTES' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <BookOpen className="w-4 h-4" />
              Materi
            </button>
            <button
              onClick={() => setViewState('QUIZ')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${viewState === 'QUIZ' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <HelpCircle className="w-4 h-4" />
              Latihan
            </button>
            <button
              onClick={() => setViewState('READER')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${viewState === 'READER' ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <FileText className="w-4 h-4" />
              PDF Asli
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pb-12">
        {viewState === 'NOTES' && (
          <div className="relative">
            <NotesView
              content={notes || ""}
              onBack={onBack}
              chapter={chapter}
              onNavigateChapter={(c) => setChapter(c)}
              isLoading={isLoadingNotes}
              complexity={noteComplexity}
              onComplexityChange={setNoteComplexity}
            />

            {/* Simplified Nav Bar (No Middle Button) - STATIC POSITION (Above Footer) */}
            {!isLoadingNotes && notes && (
              <div className="w-full mt-10 border-t border-slate-200 dark:border-slate-800 pt-8 pb-4">
                <div className="max-w-4xl mx-auto px-4 flex justify-between items-center gap-4">
                  <button
                    onClick={handlePrevChapter}
                    disabled={chapter <= 1}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium px-5 py-2.5 disabled:opacity-30 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Modul Sebelumnya</span>
                  </button>

                  <button
                    onClick={handleNextChapter}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-md hover:translate-x-1"
                  >
                    Modul Selanjutnya <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {viewState === 'QUIZ' && (
          <div className="pt-8">
            {activeQuestions ? (
              <QuizView
                key={JSON.stringify(activeQuestions[0])} // Force remount/reset when questions change
                questions={activeQuestions}
                onBack={() => setViewState('NOTES')} // Kembali ke materi
                modeName={`Latihan Modul ${chapter}`}
                isExamMode={false}
                onRetry={handleStartQuiz}
              />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] animate-in fade-in">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm text-center max-w-md border border-slate-200 dark:border-slate-700">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Latihan Soal Modul {chapter}</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                    Uji pemahaman materi Anda dengan 10 soal acak yang relevan dengan topik ini.
                  </p>
                  <button
                    onClick={handleStartQuiz}
                    disabled={isLoadingQuiz}
                    className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center"
                  >
                    {isLoadingQuiz ? <Loader2 className="animate-spin mr-2" /> : null}
                    {isLoadingQuiz ? 'Sedang Membuat Soal...' : 'Mulai Latihan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {viewState === 'READER' && (
          <div className="max-w-7xl mx-auto px-4 pt-6 animate-in fade-in pb-10">
            <PdfViewer
              pdfUrl={pdfUrl}
              fileName={course.fileName}
              userNotes={course.userPersonalNotes}
              onSaveNotes={handleSaveNotes}
            />
          </div>
        )}

        {/* Global Chat Widget - Floating */}
        <ChatWidget
          contextMaterial={currentChapterNotes}
          courseName={course.title}
          userName={userName}
        />
      </div>
    </div>
  );
};

export default StudySession;
