import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CreateCourseForm from './components/CreateCourseForm';
import CourseGrid from './components/CourseGrid';
import StudySession from './components/StudySession';
import QuizView from './components/QuizView';
import LandingPage from './components/LandingPage';
import DiscussionPartner from './components/DiscussionPartner';
import OnboardingModal from './components/OnboardingModal';
import CourseDashboard from './components/CourseDashboard';
import MaintenancePage from './components/MaintenancePage';
import LoginView from './components/LoginView';
import { AppMode, QuizQuestion, ExamHistoryItem } from './types';
import CommunityCourseGrid from './components/CommunityCourseGrid';
import { generateContentFromUri } from './services/geminiService';
import { getFileFromDB } from './services/db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertTriangle, Globe, Book } from 'lucide-react';
import { useApp } from './context/AppContext';
import LoadingOverlay from './components/LoadingOverlay';

// SET TO TRUE TO ENABLE MAINTENANCE MODE
const IS_MAINTENANCE_MODE = false;

// Access Control: Premium/Admin users who can generate AI content
const ADMIN_EMAILS = [
    "prapkurniawanmarkus@gmail.com",
    ...((import.meta as any).env.VITE_ADMIN_EMAILS || "").split(',').map((e: string) => e.trim())
].filter(Boolean);

// Simple UUID generator
const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const App: React.FC = () => {
    // Immediate return for maintenance mode
    if (IS_MAINTENANCE_MODE) {
        return <MaintenancePage />;
    }

    const {
        courses,
        activeCourse,
        userProfile,
        isDarkMode,
        mode,
        isUploading,
        error,
        toggleTheme,
        setMode,
        createProfile,
        createCourse,
        deleteCourse,
        selectCourse,
        clearActiveCourse,
        setError,
        updateCourseModule,
        updateCourseTOC, // NEW
        updateUserNotes,
        addExamHistory,
        isAppLoading,
        signOut,
        fetchPublicCourses,
        copyCourseFromPublic,
        user // Destructure the full user object
    } = useApp();

    // Local UI State
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
    const [studyInitialView, setStudyInitialView] = useState<'NOTES' | 'QUIZ' | 'READER'>('NOTES');
    const [isGeneratingExam, setIsGeneratingExam] = useState(false);
    const [examQuestions, setExamQuestions] = useState<QuizQuestion[] | null>(null);

    // Community Tab State
    const [homeTab, setHomeTab] = useState<'MY_COURSES' | 'COMMUNITY'>('MY_COURSES');
    const [publicCourses, setPublicCourses] = useState<any[]>([]);
    const [isLoadingPublic, setIsLoadingPublic] = useState(false);

    // Fetch Public Courses on Tab Change
    useEffect(() => {
        if (homeTab === 'COMMUNITY') {
            const load = async () => {
                setIsLoadingPublic(true);
                const data = await fetchPublicCourses();
                setPublicCourses(data);
                setIsLoadingPublic(false);
            };
            load();
        }
    }, [homeTab]);

    // History Review State
    const [historyReviewData, setHistoryReviewData] = useState<{
        questions: QuizQuestion[];
        answers: number[];
        analysis: string;
    } | null>(null);

    // Resume Exam State
    const [savedAnswers, setSavedAnswers] = useState<number[] | undefined>(undefined);
    const [isExamCompleted, setIsExamCompleted] = useState(false);
    const [savedAnalysis, setSavedAnalysis] = useState<string | undefined>(undefined);

    // ... (lines 104-112 unchanged)

    // URL Synchronization Effect (Recover State on Refresh)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlMode = params.get('mode') as AppMode;
        const urlCourseId = params.get('courseId');

        // Only attempt recovery if we have valid params and are currently in default state
        if (urlMode && urlCourseId && (!activeCourse || activeCourse.id !== urlCourseId)) {


            const targetCourse = courses.find(c => c.id === urlCourseId);
            if (targetCourse) {
                selectCourse(targetCourse);
                setMode(urlMode);

                // Recover Exam Session if applicable
                if (urlMode === AppMode.EXAM_SIMULATION) {
                    const savedExam = localStorage.getItem(`exam_session_${urlCourseId}`);
                    if (savedExam) {
                        try {
                            const { questions, answers, isCompleted, analysis } = JSON.parse(savedExam);
                            if (questions && Array.isArray(questions)) {
                                setExamQuestions(questions);

                                if (answers && Array.isArray(answers)) {
                                    setSavedAnswers(answers);
                                }

                                if (isCompleted) {
                                    setIsExamCompleted(true);
                                    setSavedAnalysis(analysis);
                                }
                            }
                        } catch (e) {
                        }
                    }
                }
            }
        }
    }, [courses, activeCourse]); // Run when courses load

    // Sync state TO URL
    useEffect(() => {
        if (!activeCourse) {
            // Do NOT automatically clear URL here. 
            // This prevents race condition on page load (where activeCourse is null but URL has params).
            // Clearing URL is now handled imperatively in navigation functions.
            return;
        }

        const url = new URL(window.location.href);
        url.searchParams.set('mode', mode);
        url.searchParams.set('courseId', activeCourse.id);
        window.history.replaceState({}, '', url);

        // Save Exam Session State if in Exam Mode
        if (mode === AppMode.EXAM_SIMULATION && examQuestions) {
            localStorage.setItem(`exam_session_${activeCourse.id}`, JSON.stringify({
                questions: examQuestions,
                timestamp: Date.now()
            }));
        }

    }, [mode, activeCourse, examQuestions]);


    // Load PDF Blob when activeCourse changes
    useEffect(() => {
        const loadPdf = async () => {
            setActivePdfUrl(null);
            if (activeCourse) {

                try {
                    // ... (rest of PDF loading logic)
                    // 1. Try to load from local IndexedDB first (for owned courses)
                    const file = await getFileFromDB(activeCourse.id);
                    if (file) {

                        const url = URL.createObjectURL(file);
                        setActivePdfUrl(url);
                        return;
                    }

                    // 2. Fallback: Use storageUrl from Supabase Storage (for enrolled courses)
                    if (activeCourse.storageUrl) {
                        setActivePdfUrl(activeCourse.storageUrl);
                        return;
                    }

                    // 3. Validation: fileUri from Gemini is NOT accessible for PDF Viewer (403 Error)
                    // We only use fileUri if it happens to be a public URL (legacy), but standard upload flow uses Supabase Storage.
                    if (activeCourse.fileUri && !activeCourse.fileUri.includes('generativelanguage.googleapis.com')) {
                        console.warn("[PDF] Using fileUri fallback (Legacy/External):", activeCourse.fileUri);
                        setActivePdfUrl(activeCourse.fileUri);
                        return;
                    }

                    console.warn("[PDF] No valid PUBLIC PDF URL available. (fileUri is private Gemini Link)");
                    // Explicitly set null to trigger Error UI in StudySession
                    setActivePdfUrl(null);
                } catch (e) {
                    console.error("Failed to load PDF for reader", e);
                }
            }
        };
        loadPdf();

        return () => {
            if (activePdfUrl && activePdfUrl.startsWith('blob:')) {
                URL.revokeObjectURL(activePdfUrl);
            }
        };
    }, [activeCourse?.id]); // Only reload if ID changes

    const handleStartApp = () => {
        if (userProfile) {
            setMode(AppMode.HOME);
        } else {
            // Redirect to LOGIN instead of Onboarding if not authed
            setMode(AppMode.LOGIN);
        }
    };

    const handleCreateCourseWrapper = async (title: string, code: string, file: File, isPublic: boolean) => {
        await createCourse(title, code, file, isPublic);
        setShowCreateModal(false);
    };

    const handleExamComplete = (score: number, total: number, analysis: string, questions: QuizQuestion[], answers: number[]) => {
        if (!activeCourse) return;

        const newHistoryItem: ExamHistoryItem = {
            id: generateId(),
            date: Date.now(),
            score: score,
            totalQuestions: total,
            analysisSummary: analysis,
            questions: questions,
            userAnswers: answers
        };

        addExamHistory(activeCourse.id, newHistoryItem);

        // Save completion state to localStorage so refresh works
        localStorage.setItem(`exam_session_${activeCourse.id}`, JSON.stringify({
            questions: questions,
            answers: answers,
            isCompleted: true,
            analysis: analysis,
            timestamp: Date.now()
        }));
    };

    const handleViewHistory = (item: ExamHistoryItem) => {
        if (!item.questions || !item.userAnswers) {
            setError("Data detail ujian ini tidak tersedia (format lama).");
            return;
        }
        setHistoryReviewData({
            questions: item.questions,
            answers: item.userAnswers,
            analysis: item.analysisSummary
        });
        setMode(AppMode.EXAM_SIMULATION);
    };

    const handleBackToHome = () => {
        clearActiveCourse();
        resetFeatures();
        // Explicitly clear URL
        window.history.pushState({}, '', window.location.pathname);
    };

    const handleBackToDashboard = () => {
        resetFeatures();
        setMode(AppMode.COURSE_DASHBOARD);
    };

    const resetFeatures = () => {
        setExamQuestions(null);
        setHistoryReviewData(null);
        setError(null);
        setIsGeneratingExam(false);
        setIsExamCompleted(false);
        setSavedAnalysis(undefined);
    };

    const openStudySession = (view: 'NOTES' | 'QUIZ' | 'READER') => {
        setStudyInitialView(view);
        setMode(AppMode.STUDY_SESSION);
    };

    const startExamSimulation = async () => {
        if (!activeCourse) return;

        // --- DAILY LIMIT CHECK FOR BASIC USERS ---
        const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
        if (!isAdmin) {
            const today = new Date().setHours(0, 0, 0, 0);
            const todaysExams = activeCourse.examHistory.filter(h => h.date >= today);

            if (todaysExams.length >= 5) {
                setError("😴 **Istirahat Dulu Bro!**\n\nKuota latihan harianmu (5x sehari) sudah habis. Otak juga butuh cooling down, lanjut besok lagi yahh! \n\n*Upgrade ke Premium untuk latihan tanpa batas.*");
                return;
            }
        }
        // -----------------------------------------

        setExamQuestions(null);
        setHistoryReviewData(null);
        setIsGeneratingExam(true);
        setError(null);

        try {
            // 0. CHECK PREMIUM STATUS
            // Premium users (or Admins) should ALWAYS generate new questions to enrich the bank.
            // Basic users try to fetch from bank first.
            const isPremium = (user?.user_metadata?.plan === 'PREMIUM') || (user?.email && ADMIN_EMAILS.includes(user.email));

            // 1. Try Fetching from Bank First (ONLY FOR BASIC USERS)
            if (!isPremium) {
                // Import dynamically to avoid circle deps if any (though unlikely here) or just use direct import if possible
                // We'll use the one imported from geminiService
                const { fetchQuestionsFromBank, incrementUserQuota } = await import('./services/geminiService');

                // Fetch from Bank (Chapter undefined means ALL chapters)
                const bankQuestions = await fetchQuestionsFromBank(activeCourse.code, undefined, 45);

                if (bankQuestions && bankQuestions.length >= 10) {


                    // --- MANUAL QUOTA INCREMENT FOR BANK USAGE ---
                    // Since using Bank skips the AI generation wrapper that normally checks quota,
                    // we must manually enforce limits here.
                    if (user?.id && user?.email && !ADMIN_EMAILS.includes(user.email)) {
                        try {
                            await incrementUserQuota(user.id, user.email);
                        } catch (quotaError: any) {
                            setError("😴 **Istirahat Dulu Bro!**\n\nKuota latihan harianmu (5x sehari) sudah habis. Lanjut besok lagi ya! \n\n*Upgrade ke Premium untuk latihan tanpa batas.*");
                            setIsGeneratingExam(false);
                            return;
                        }
                    }
                    // ---------------------------------------------

                    // ARTIFICIAL DELAY: 4 Detik (Sesuai request user: biar sempat baca loading "lucu")
                    await new Promise(resolve => setTimeout(resolve, 4000));

                    // If we have at least 10, proceed with Bank Questions
                    // (Bank return is already randomized by RPC or fallback shuffle)
                    setExamQuestions(bankQuestions);
                    setMode(AppMode.EXAM_SIMULATION);
                    setIsGeneratingExam(false);
                    return;
                }
            }


            // 2. CHECK USER TIER & DAILY LIMIT (Only check if they are ALLOWED to generate, Quota check inside API)
            // But we must block BASIC users from AI GENERATION if Bank is empty.


            // 2. CHECK USER TIER & DAILY LIMIT (Only check if they are ALLOWED to generate, Quota check inside API)
            // But we must block BASIC users from AI GENERATION if Bank is empty.
            // "batasi manual aja 5x sehari" implies they CAN generate if < 5?
            // "Karena Anda pengguna Basic, Anda tidak dapat meng-generate soal baru" -> Wait, previous error message said BLOCK.
            // The prompt says "Limit user basic when in exam".

            // Re-reading code at line 353 (old):
            // if (!canGenerate) { setError... return; }

            // "canGenerate" was `ADMIN_EMAILS.includes(user.email)`.
            // This means Basic Users were BLOCKED from generating entirely.

            // If the user request is "Limit user basic... table empty", maybe they tried Bank (which worked) but didn't increment.

            // So my hypothesis holds: They used Bank questions (which worked) but didn't increment.

            // I will keep the block for AI generation for now, unless instructed otherwise.
            // The fix above handles the Bank Increment.
            const canGenerate = user?.email && ADMIN_EMAILS.includes(user.email);

            // Check Daily Limit for BASIC users (even if using Bank) wait actually, 
            // The request implies LIMITING THE EXAM itself regardless of source if Basic?
            // "batasi manual aja 5x sehari"
            // Let's apply this check at the very start of the function, before even checking the bank?
            // Actually, let's put it here or before bank check?
            // If I put it here, they can do unlimited Bank exams? 
            // Re-reading: "batasi manual aja 5x sehari" -> Likely applies to the Act of taking exam.

            // Let's restart the edit to place it at the TOP of the function.
            // Cancelling this chunk to apply a new one at top of function.


            if (!canGenerate) {
                // Basic User + Empty Bank = BLOCK
                setError("🔒 **Bank Soal Masih Kosong**\n\nBelum ada soal tersedia di bank soal komunitas untuk mata kuliah ini. \n\nKarena Anda pengguna Basic, Anda tidak dapat meng-generate soal baru menggunakan AI. Silakan tunggu hingga ada kontributor lain atau Upgrade ke Premium untuk generate soal instan.");
                setIsGeneratingExam(false);
                return;
            }

            // 3. If Premium, Generate via AI
            const result = await generateContentFromUri(
                activeCourse.fileUri,
                activeCourse.mimeType,
                AppMode.EXAM_SIMULATION,
                userProfile?.name,
                undefined, // topic
                1, // chapter default
                'QUIZ',
                'NORMAL',
                user?.id,
                user?.email
            );

            if (Array.isArray(result)) {
                setExamQuestions(result);
                setMode(AppMode.EXAM_SIMULATION);

                // Save generated exam questions to Bank as "General Practice" (Chapter 0)
                // This populates the bank so future users can use them (and save tokens)
                if (user?.id) {
                    const { saveQuestionsToBank } = await import('./services/geminiService');
                    saveQuestionsToBank(activeCourse.code, 0, result, user.id);
                }
            }
        } catch (e: any) {
            setError(e.message || "Gagal membuat soal ujian.");
        } finally {
            setIsGeneratingExam(false);
        }
    };

    if (isAppLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-slate-950">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-900 transition-colors duration-300">
            {/* Onboarding Modal */}
            {showOnboarding && (
                <OnboardingModal
                    isOpen={showOnboarding}
                    onClose={(name) => {
                        if (name) {
                            createProfile(name);
                            setShowOnboarding(false);
                        } else {
                            // User cancelled / closed without finishing
                            setShowOnboarding(false);
                            // Ensure we stay on Landing Page if no profile exists
                            if (!userProfile) {
                                setMode(AppMode.LANDING);
                            }
                        }
                    }}
                />
            )}

            {/* Only show Header if NOT in Landing Page or Login Page */}
            {mode !== AppMode.LANDING && mode !== AppMode.LOGIN && (
                <Header
                    resetApp={() => window.location.reload()}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    userName={userProfile?.name}
                    onLogout={async () => {
                        await signOut();
                        resetFeatures();
                        window.history.replaceState({}, '', window.location.pathname);
                    }}
                />
            )}

            <main className="flex-1 relative">
                {/* Error Toast */}
                {error && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-5 max-w-lg w-full mx-4">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 dark:hover:text-red-300">×</button>
                    </div>
                )}



                {/* Exam Generation Overlay */}
                <LoadingOverlay isVisible={isGeneratingExam} />

                {/* Create Course Modal */}
                {showCreateModal && (
                    <CreateCourseForm
                        onSubmit={handleCreateCourseWrapper}
                        onCancel={() => setShowCreateModal(false)}
                        isUploading={isUploading}
                    />
                )}

                {/* --- VIEWS --- */}

                {/* 0. Login View */}
                {mode === AppMode.LOGIN && (
                    <LoginView onLoginSuccess={() => setMode(AppMode.HOME)} />
                )}

                {/* 1. Landing Page */}
                {mode === AppMode.LANDING && (
                    <LandingPage
                        onStart={handleStartApp}
                        isDarkMode={isDarkMode}
                        toggleTheme={toggleTheme}
                    />
                )}

                {/* 2. Home / Course List */}
                {mode === AppMode.HOME && (
                    <div className="max-w-6xl mx-auto px-4 py-8">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Belajar</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Kelola kelas Anda atau jelajahi modul dari komunitas.</p>
                        </div>

                        <Tabs defaultValue={homeTab} onValueChange={(v) => setHomeTab(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
                                <TabsTrigger value="MY_COURSES" className="flex items-center gap-2">
                                    <Book className="w-4 h-4" /> Kelas Saya
                                </TabsTrigger>
                                <TabsTrigger value="COMMUNITY" className="flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> Komunitas
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="MY_COURSES" className="animate-in fade-in-50 duration-500">
                                <CourseGrid
                                    courses={courses}
                                    user={user} // Pass user for authcheck
                                    onSelectCourse={selectCourse}
                                    onDeleteCourse={deleteCourse}
                                    onAddCourse={() => setShowCreateModal(true)}
                                />
                            </TabsContent>

                            <TabsContent value="COMMUNITY" className="animate-in fade-in-50 duration-500">
                                <CommunityCourseGrid
                                    courses={publicCourses}
                                    myCourses={courses} // Pass my courses for duplicate check
                                    isLoading={isLoadingPublic}
                                    onCopyCourse={async (course) => {
                                        await copyCourseFromPublic(course);
                                        setHomeTab('MY_COURSES');
                                    }}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                )}

                {/* 3. Course Dashboard (Menu Pilihan) */}
                {mode === AppMode.COURSE_DASHBOARD && activeCourse && (
                    <CourseDashboard
                        course={activeCourse}
                        onBack={handleBackToHome}
                        onOpenStudySession={() => openStudySession('NOTES')}
                        onOpenDiscussion={() => setMode(AppMode.DISCUSSION_PARTNER)}
                        onStartExam={startExamSimulation}
                        onViewHistory={handleViewHistory}
                    />
                )}

                {/* 4. Study Session Mode */}
                {mode === AppMode.STUDY_SESSION && activeCourse && activePdfUrl && (
                    <StudySession
                        course={activeCourse}
                        initialChapter={1}
                        pdfUrl={activePdfUrl}
                        onBack={handleBackToDashboard}
                        onUpdateData={updateCourseModule}
                        onUpdateTOC={updateCourseTOC}
                        onUpdateUserNotes={updateUserNotes}
                        initialView={studyInitialView}
                        userName={userProfile?.name}
                        userId={user?.id}
                        canGenerate={user?.email ? ADMIN_EMAILS.includes(user.email) : false}
                    />
                )}

                {/* 5. Exam Simulation Mode (New Exam OR History Review) */}
                {mode === AppMode.EXAM_SIMULATION && activeCourse && (
                    historyReviewData ? (
                        <QuizView
                            questions={historyReviewData.questions}
                            onBack={() => {
                                setHistoryReviewData(null);
                                setMode(AppMode.COURSE_DASHBOARD);
                            }}
                            modeName="Review Hasil Ujian"
                            isExamMode={true}
                            initialAnswers={historyReviewData.answers}
                            initialIsCompleted={true}
                            initialAnalysis={historyReviewData.analysis}
                            courseCode={activeCourse?.code || ''}
                        />
                    ) : (
                        examQuestions && (
                            <QuizView
                                questions={examQuestions}
                                onComplete={handleExamComplete}
                                courseCode={activeCourse?.code || ''}
                                onBack={() => {
                                    handleBackToDashboard();
                                    // Clear saved session on explicit exit
                                    if (activeCourse) localStorage.removeItem(`exam_session_${activeCourse.id}`);
                                }}
                                modeName="Simulasi Ujian Akhir Semester"
                                isExamMode={true}
                                canAnalyze={user?.email ? ADMIN_EMAILS.includes(user.email) : false}
                                initialAnswers={savedAnswers} // Pass restored answers
                                initialIsCompleted={isExamCompleted} // Pass restored completion status
                                initialAnalysis={savedAnalysis} // Pass restored analysis
                                onProgress={(currentAnswers) => {
                                    // Save progress to localStorage (debounced ideally, but safe enough here)
                                    if (activeCourse && examQuestions) {
                                        localStorage.setItem(`exam_session_${activeCourse.id}`, JSON.stringify({
                                            questions: examQuestions,
                                            answers: currentAnswers,
                                            isCompleted: false, // Explicitly not completed during progress
                                            timestamp: Date.now()
                                        }));
                                    }
                                }}
                            />
                        )
                    )
                )}

                {/* 6. Discussion Partner Mode */}
                {mode === AppMode.DISCUSSION_PARTNER && activeCourse && (
                    <DiscussionPartner
                        courseName={activeCourse.title}
                        courseCode={activeCourse.code}
                        userName={userProfile?.name || "Mahasiswa"}
                        onBack={() => setMode(AppMode.COURSE_DASHBOARD)}
                    />
                )}
            </main>
        </div>
    );
};

export default App;