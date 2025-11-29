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
import MaintenancePage from './components/MaintenancePage'; // Import Maintenance Page
import { AppMode, QuizQuestion, ExamHistoryItem } from './types';
import { generateContentFromUri } from './services/geminiService';
import { getFileFromDB } from './services/db';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useApp } from './context/AppContext';

// SET TO TRUE TO ENABLE MAINTENANCE MODE
const IS_MAINTENANCE_MODE = true;

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
        updateUserNotes,
        addExamHistory,
        isAppLoading
    } = useApp();

    // Local UI State
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
    const [studyInitialView, setStudyInitialView] = useState<'NOTES' | 'QUIZ' | 'READER'>('NOTES');
    const [isGeneratingExam, setIsGeneratingExam] = useState(false);
    const [examQuestions, setExamQuestions] = useState<QuizQuestion[] | null>(null);

    // History Review State
    const [historyReviewData, setHistoryReviewData] = useState<{
        questions: QuizQuestion[];
        answers: number[];
        analysis: string;
    } | null>(null);


    // Initial Check for Onboarding - REMOVED AUTO EFFECT
    // useEffect(() => {
    //     if (!isAppLoading && !userProfile) {
    //         setShowOnboarding(true);
    //     } else {
    //         setShowOnboarding(false);
    //     }
    // }, [userProfile, isAppLoading]);

    // Load PDF Blob when activeCourse changes
    useEffect(() => {
        const loadPdf = async () => {
            setActivePdfUrl(null);
            if (activeCourse) {
                try {
                    const file = await getFileFromDB(activeCourse.id);
                    if (file) {
                        const url = URL.createObjectURL(file);
                        setActivePdfUrl(url);
                    }
                } catch (e) {
                    console.error("Failed to load PDF for reader", e);
                }
            }
        };
        loadPdf();

        return () => {
            if (activePdfUrl) {
                URL.revokeObjectURL(activePdfUrl);
            }
        };
    }, [activeCourse?.id]); // Only reload if ID changes

    const handleStartApp = () => {
        if (userProfile) {
            setMode(AppMode.HOME);
        } else {
            setShowOnboarding(true);
        }
    };

    const handleCreateCourseWrapper = async (title: string, code: string, file: File) => {
        await createCourse(title, code, file);
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
    };

    const openStudySession = (view: 'NOTES' | 'QUIZ' | 'READER') => {
        setStudyInitialView(view);
        setMode(AppMode.STUDY_SESSION);
    };

    const startExamSimulation = async () => {
        if (!activeCourse) return;

        // Always regenerate to ensure fresh questions
        setExamQuestions(null);
        setHistoryReviewData(null); // Ensure we are not in review mode
        setIsGeneratingExam(true);
        setError(null);

        try {
            const result = await generateContentFromUri(
                activeCourse.fileUri,
                activeCourse.mimeType,
                AppMode.EXAM_SIMULATION,
                userProfile?.name
            );
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

    if (isAppLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-slate-950">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-300">
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

            {/* Only show Header if NOT in Landing Page */}
            {mode !== AppMode.LANDING && (
                <Header
                    resetApp={() => window.location.reload()}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    userName={userProfile?.name}
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
                {isGeneratingExam && (
                    <div className="fixed inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Menyiapkan Soal Ujian Baru...</h3>
                        <p className="text-slate-500 dark:text-slate-400">AI sedang menyusun 45 soal dari seluruh modul.</p>
                    </div>
                )}

                {/* Create Course Modal */}
                {showCreateModal && (
                    <CreateCourseForm
                        onSubmit={handleCreateCourseWrapper}
                        onCancel={() => setShowCreateModal(false)}
                        isUploading={isUploading}
                    />
                )}

                {/* --- VIEWS --- */}

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
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kelas Saya</h1>
                                <p className="text-slate-500 dark:text-slate-400">Lanjutkan belajar dari modul yang sudah diupload.</p>
                            </div>
                        </div>

                        <CourseGrid
                            courses={courses}
                            onSelectCourse={selectCourse}
                            onDeleteCourse={deleteCourse}
                            onAddCourse={() => setShowCreateModal(true)}
                        />
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
                        onUpdateUserNotes={updateUserNotes}
                        initialView={studyInitialView}
                        userName={userProfile?.name}
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
                        />
                    ) : (
                        examQuestions && (
                            <QuizView
                                questions={examQuestions}
                                onComplete={handleExamComplete}
                                onBack={handleBackToDashboard}
                                modeName="Simulasi Ujian Akhir Semester"
                                isExamMode={true}
                            />
                        )
                    )
                )}

                {/* 6. Discussion Partner Mode */}
                {mode === AppMode.DISCUSSION_PARTNER && activeCourse && (
                    <DiscussionPartner
                        courseName={activeCourse.title}
                        userName={userProfile?.name || "Mahasiswa"}
                        onBack={() => setMode(AppMode.COURSE_DASHBOARD)}
                    />
                )}
            </main>
        </div>
    );
};

export default App;