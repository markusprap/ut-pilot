import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion, AppMode, Course, ModuleData } from '../types';
import { generateContentFromUri, NoteComplexity } from '../services/geminiService';
import NotesView from './NotesView';
import QuizView from './QuizView';
import PdfViewer from './PdfViewer';
import ChatWidget from './ChatWidget';
import MarkdownRenderer from './MarkdownRenderer';
import { Loader2, ArrowLeft, ArrowRight, BookOpen, HelpCircle, FileText, Lock } from 'lucide-react';
import { CustomAlert } from './CustomModal';
import StudySidebar from './StudySidebar';
import LoadingOverlay from './LoadingOverlay';

interface StudySessionProps {
  course: Course;
  initialChapter: number;
  initialView?: 'NOTES' | 'QUIZ' | 'READER';
  onBack: () => void;
  onUpdateData: (courseId: string, chapter: number, data: Partial<ModuleData>) => void;
  onUpdateTOC?: (courseId: string, toc: { chapter: number; title: string }[]) => void;
  onUpdateUserNotes?: (courseId: string, notes: string) => void;
  pdfUrl: string | null;
  userName?: string;
  userId?: string; // NEW: To track daily limits via DB
  canGenerate?: boolean;
}

type ViewState = 'NOTES' | 'QUIZ' | 'READER';

const StudySession: React.FC<StudySessionProps> = ({ course, initialChapter, initialView = 'NOTES', onBack, onUpdateData, onUpdateTOC, onUpdateUserNotes, pdfUrl, userName = "Mahasiswa", userId, canGenerate = true }) => {
  const [chapter, setChapter] = useState(initialChapter);

  const [viewState, setViewState] = useState<ViewState>(initialView);
  const [quizSessionId, setQuizSessionId] = useState(0); // Unique ID for forcing QuizView remount
  const [quizKBIndex, setQuizKBIndex] = useState(0); // Track which KB section to show (cycles on retry)
  const lastSessionIdRendered = useRef(0); // Track if this is a continuation or fresh start
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

  // NEW: PERSISTENT QUIZ STATE (Answers & Current Index)
  const [quizState, setQuizState] = useState<{ answers: number[]; currentIndex: number; isCompleted: boolean }>({
    answers: [],
    currentIndex: 0,
    isCompleted: false
  });

  // NEW: PERSISTENT PDF PAGE STATE
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfScale, setPdfScale] = useState<number | undefined>(undefined);

  // Loading States
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isScanningTOC, setIsScanningTOC] = useState(false);

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open on desktop
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // 0. Smart TOC Scanner Effect
  useEffect(() => {
    // If TOC exists, we are good.
    if (course.toc && course.toc.length > 0) return;

    // If no TOC, and user can generate, we scan.
    // If user cannot generate (Basic), we might fallback to default 1-9 (handled in Sidebar)
    if (!canGenerate) return;

    const scanTOC = async () => {

      setIsScanningTOC(true);
      try {
        const result = await generateContentFromUri(
          course.fileUri,
          course.mimeType,
          AppMode.STUDY_SESSION,
          userName,
          undefined, // topic
          1, // chapter dummy
          'TOC'
        );

        if (Array.isArray(result) && result.length > 0 && 'chapter' in result[0]) {
          // Validate and Sort
          const toc = (result as any[])
            .map((item: any) => ({ chapter: Number(item.chapter), title: String(item.title) }))
            .sort((a, b) => a.chapter - b.chapter);

          if (onUpdateTOC) {
            onUpdateTOC(course.id, toc);
          }
        }
      } catch (e) {
        console.error("Failed to Scan TOC:", e);
        // Fallback: Don't block forever, just let user assume defaults
      } finally {
        setIsScanningTOC(false);
      }
    };

    scanTOC();
  }, [course.id, course.toc]);

  // Load Notes: Check Local Storage (Props) first, then API
  useEffect(() => {
    // Block Note Loading if Scanning TOC (Prioritize Structure)
    if (isScanningTOC) return;

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

      // 2. If no existing content and user CAN'T generate (Basic user), show unavailable message
      if (!canGenerate) {

        setNotes("🔒 **Materi Belum Tersedia**\n\nMateri untuk bab ini belum dibuat oleh pemilik kelas.\n\nSebagai pengguna Basic, Anda hanya dapat membaca materi yang sudah ada.\n\n*Hubungi pemilik kelas untuk meminta mereka membuat materi bab ini.*");
        return;
      }

      // 3. If user CAN generate (Premium/Admin),
      setIsLoadingNotes(true);
      setNotes(null); // Clear previous notes to force loading state
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

        if (!textContent) {
          throw new Error("Received empty content from AI");
        }

        setNotes(textContent);

        // 4. Save back to App State (Persistent Storage) based on Complexity
        let dataToUpdate: Partial<ModuleData> = {};
        if (noteComplexity === 'NORMAL') dataToUpdate = { notes: textContent };
        else if (noteComplexity === 'EASY') dataToUpdate = { notesEasy: textContent };
        else if (noteComplexity === 'VERY_EASY') dataToUpdate = { notesVeryEasy: textContent };

        onUpdateData(course.id, chapter, dataToUpdate);

      } catch (error) {
        console.error("[StudySession] Error loading notes:", error);
        setNotes("Gagal memuat catatan. Silakan periksa koneksi internet atau file PDF Anda. (Cek Console untuk detail error)");
        setAlertState({
          isOpen: true,
          title: "Gagal Memuat Materi",
          message: `Terjadi kesalahan saat menghubungi AI.`,
          type: "error"
        });
      } finally {
        setIsLoadingNotes(false);
      }
    };

    loadNotes();
  }, [chapter, course.id, viewState, noteComplexity]); // Trigger when chapter, viewState OR complexity changes

  // Helper to get sequential questions by KB section (not random)
  // Questions are generated in KB order, so we split by estimated KB size and cycle
  const getSequentialQuestions = (pool: QuizQuestion[], kbIndex: number, count: number = 10): QuizQuestion[] => {
    if (pool.length <= count) return pool; // Return all if pool is small

    // Estimate 3 KBs per module (typical UT module structure)
    const estimatedKBCount = 3;
    const questionsPerKB = Math.ceil(pool.length / estimatedKBCount);

    // Calculate start index based on KB (cycle through)
    const effectiveKBIndex = kbIndex % estimatedKBCount;
    const startIdx = effectiveKBIndex * questionsPerKB;

    // Get questions for this KB section
    const kbQuestions = pool.slice(startIdx, startIdx + questionsPerKB);

    // Return up to 'count' questions (in order, not shuffled)
    return kbQuestions.slice(0, count);
  };

  // Handler to start quiz for current chapter
  const handleStartQuiz = async () => {
    // 1. Check if we already have the quiz POOL for this chapter
    const existingData = course.modules[chapter];
    let pool = existingData?.quiz;

    // Reset Quiz State for new session
    const resetState = (qCount: number) => ({
      answers: new Array(qCount).fill(-1),
      currentIndex: 0,
      isCompleted: false
    });

    if (pool && pool.length > 0) {
      // Use existing pool, get questions from current KB section (cycles on retry)
      const selectedQuestions = getSequentialQuestions(pool, quizKBIndex, 10);
      setActiveQuestions(selectedQuestions);
      setQuizState(resetState(selectedQuestions.length)); // Prepare state BEFORE viewState change
      setQuizSessionId(prev => prev + 1); // Force QuizView remount
      setQuizKBIndex(prev => prev + 1); // Cycle to next KB section on next retry
      setViewState('QUIZ');
      return;
    }

    setIsLoadingQuiz(true);

    try {
      // 2. Try Fetching from SHARED BANK (Database)
      // We import these dynamically or assumes they are available
      const { fetchQuestionsFromBank, saveQuestionsToBank } = await import('../services/geminiService');

      // PREMIUM STRATEGY: Skip Bank Fetch to force AI Generation (Enriching the Bank)
      // Only Basic users (canGenerate=false) should look at the bank first.
      // Premium users will skip this and go straight to AI Generation below.
      let bankQuestions = null;
      if (!canGenerate) {
        bankQuestions = await fetchQuestionsFromBank(course.code, chapter);
      }

      if (bankQuestions && bankQuestions.length > 0) {

        // ARTIFICIAL DELAY: 4 Detik (Sesuai request: biar sempat baca loading "lucu")
        // LoadingOverlay controlled by isLoadingQuiz=true
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Save to Local State for future use
        onUpdateData(course.id, chapter, { quiz: bankQuestions });
        const selectedQuestions = getSequentialQuestions(bankQuestions, quizKBIndex, 10);
        setActiveQuestions(selectedQuestions);
        setQuizState(resetState(selectedQuestions.length)); // Prepare state
        setQuizKBIndex(prev => prev + 1); // Cycle to next KB section on next retry
        setViewState('QUIZ');
        setIsLoadingQuiz(false);
        return;
      }

      // 3. If no existing quiz and user CAN'T generate (Basic user), show error
      if (!canGenerate) {
        setAlertState({
          isOpen: true,
          title: '🔒 Kuis Belum Tersedia',
          message: 'Kuis untuk bab ini belum dibuat oleh komunitas. Sebagai pengguna Basic, Anda hanya dapat mengerjakan kuis yang sudah tersedia di Bank Soal.',
          type: 'info'
        });
        setIsLoadingQuiz(false);
        return;
      }

      // 4. If user CAN generate, fetch from AI (Fetch large batch for pooling)
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

      // 5. Save Pool back to App State (Local)
      onUpdateData(course.id, chapter, { quiz: quizPool });

      // 6. Save to SHARED BANK (Async - Don't block UI)
      if (course.userId) {
        saveQuestionsToBank(course.code, chapter, quizPool, course.userId).then(() => {
        });
      }

      // 7. Set Active Questions (sequential by KB)
      const selectedQuestions = getSequentialQuestions(quizPool, quizKBIndex, 10);
      setActiveQuestions(selectedQuestions);
      setQuizState(resetState(selectedQuestions.length)); // Prepare state
      setQuizSessionId(prev => prev + 1); // Force QuizView remount
      setQuizKBIndex(prev => prev + 1); // Cycle to next KB section on next retry
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
    setQuizState({ answers: [], currentIndex: 0, isCompleted: false }); // Reset state
    setPdfPage(1); // Reset PDF Page
    // Note complexity remains preferred setting
  };

  const handlePrevChapter = () => {
    if (chapter > 1) {
      setChapter(prev => prev - 1);
      setActiveQuestions(null);
      setNotes(null);
      setQuizState({ answers: [], currentIndex: 0, isCompleted: false }); // Reset state
      setPdfPage(1); // Reset PDF Page
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

      {/* GLOBAL LOADING OVERLAY FOR QUIZ */}
      <LoadingOverlay isVisible={isLoadingQuiz} />

      {/* BLOCKING OVERLAY FOR TOC SCANNING */}
      {isScanningTOC && (
        <div className="fixed inset-0 z-[60] bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 transition-all duration-500">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <BookOpen className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Menganalisis Struktur Modul...</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md animate-pulse">
            AI sedang membaca Daftar Isi untuk menyusun navigasi kelas Anda. Mohon tunggu sebentar...
          </p>
          <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-full text-sm font-medium text-slate-600 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            Processing PDF Structure
          </div>
        </div>
      )}

      {/* Sticky Header for Session */}
      <div className="sticky top-16 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm transition-colors duration-300">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-800 dark:text-slate-400'}`}
              title={isSidebarOpen ? "Tutup Daftar Modul" : "Buka Daftar Modul"}
            >
              <div className="flex flex-col gap-1 w-5">
                <span className="w-full h-0.5 bg-current rounded-full"></span>
                <span className="w-3/4 h-0.5 bg-current rounded-full"></span>
                <span className="w-full h-0.5 bg-current rounded-full"></span>
              </div>
            </button>

            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Modul {chapter}</h2>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="hidden sm:inline">Navigasi Cepat</span>
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

      <StudySidebar
        currentChapter={chapter}
        toc={course.toc} // Pass generated TOC
        modules={course.modules}
        onSelectChapter={(c) => {
          setChapter(c);
          setNotes(null); // Clear notes to force reload/re-check
          setActiveQuestions(null);
          // On mobile, sidebar matches close behavior inside component, 
          // but we might want to ensure consistent state here if needed.
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area - Shifted when sidebar is open */}
      <div className={`pb-12 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:pl-72' : ''}`}>
        {viewState === 'NOTES' && (
          <div className="relative">
            <NotesView
              content={notes || ""}
              onBack={onBack}
              chapter={chapter}
              onNavigateChapter={(c) => {
                setChapter(c);
                setNotes(null);
              }}
              isLoading={isLoadingNotes}
              complexity={noteComplexity}
              onComplexityChange={setNoteComplexity}
              onSaveContent={(newContent) => {
                setNotes(newContent); // Update local state
                // Update DB/Storage
                let dataToUpdate: Partial<ModuleData> = {};
                if (noteComplexity === 'NORMAL') dataToUpdate = { notes: newContent };
                else if (noteComplexity === 'EASY') dataToUpdate = { notesEasy: newContent };
                else if (noteComplexity === 'VERY_EASY') dataToUpdate = { notesVeryEasy: newContent };
                onUpdateData(course.id, chapter, dataToUpdate);
              }}
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
                key={`quiz-session-${quizSessionId}`} // Force remount with unique session ID
                questions={activeQuestions}
                onBack={() => setViewState('NOTES')} // Kembali ke materi
                modeName={`Latihan Modul ${chapter}`}
                isExamMode={false}
                onRetry={handleStartQuiz}

                // STATE PERSISTENCE PROPS - Only pass if this is NOT a fresh session
                // If quizSessionId > lastSessionIdRendered, it's a new session - don't pass stale props
                initialAnswers={quizSessionId === lastSessionIdRendered.current && quizState.answers.length > 0 ? quizState.answers : undefined}
                initialIndex={quizSessionId === lastSessionIdRendered.current ? quizState.currentIndex : 0}
                initialIsCompleted={quizSessionId === lastSessionIdRendered.current ? quizState.isCompleted : false}
                onProgress={(latestAnswers) => {
                  setQuizState(prev => ({ ...prev, answers: latestAnswers }));
                  lastSessionIdRendered.current = quizSessionId; // Mark this session as "rendered"
                }}
                onIndexChange={(idx) => setQuizState(prev => ({ ...prev, currentIndex: idx }))}
                onComplete={(score, total, analysis, q, a) => {
                  // Keep persistent state as completed
                  setQuizState(prev => ({ ...prev, isCompleted: true, answers: a }));
                }}
                courseCode={course.code}
                sessionId={quizSessionId}
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
              initialPage={pdfPage}
              onPageChange={setPdfPage}
              initialScale={pdfScale}
              onScaleChange={setPdfScale}
            />
          </div>
        )}

        {/* Global Chat Widget - Floating */}
        <ChatWidget
          contextMaterial={currentChapterNotes}
          courseName={course.title}
          courseId={course.id}
          userName={userName}
          userId={userId}
          isPremium={canGenerate}
        />
      </div>
    </div>
  );
};

export default StudySession;
