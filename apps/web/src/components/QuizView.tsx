import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, AlertCircle, ArrowRight, ArrowLeft, Clock, BrainCircuit, Loader2, Save, LayoutGrid } from 'lucide-react';
import { analyzeExamPerformance } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { Skeleton, TextSkeleton } from './Skeleton';
import { CustomConfirm } from './CustomModal';

interface QuizViewProps {
    questions: QuizQuestion[];
    onBack: () => void;
    modeName: string;
    isExamMode?: boolean;
    onComplete?: (score: number, total: number, analysis: string, questions: QuizQuestion[], answers: number[]) => void; // Callback for history
    initialAnswers?: number[];
    initialIsCompleted?: boolean;
    initialAnalysis?: string;
    onRetry?: () => void;
    canAnalyze?: boolean; // NEW: Control AI Analysis permission
    onProgress?: (answers: number[]) => void; // NEW: Save progress callback
    initialIndex?: number; // NEW: Start from specific question
    onIndexChange?: (index: number) => void; // NEW: Report current index
    courseCode: string; // NEW: Required for Image Generation
}

const QuizView: React.FC<QuizViewProps> = ({
    questions,
    onBack,
    modeName,
    isExamMode = false,
    onComplete,
    initialAnswers,
    initialIsCompleted = false,
    initialAnalysis,
    onRetry,
    canAnalyze = false,
    onProgress,
    initialIndex = 0, // Default to 0
    onIndexChange,
    courseCode
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [answers, setAnswers] = useState<number[]>(initialAnswers || new Array(questions.length).fill(-1));
    const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({}); // NEW: Local image cache
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    // Sync Progress (Answers)
    useEffect(() => {
        if (onProgress) {
            onProgress(answers);
        }
    }, [answers, onProgress]);

    // Sync Index Change
    useEffect(() => {
        if (onIndexChange) {
            onIndexChange(currentIndex);
        }
    }, [currentIndex, onIndexChange]);

    const [score, setScore] = useState(0);
    const [isCompleted, setIsCompleted] = useState(initialIsCompleted);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(initialAnalysis || null);
    const [timeLeft, setTimeLeft] = useState(isExamMode ? 120 * 60 : 0); // 120 minutes for exam
    const [showExplanation, setShowExplanation] = useState(false);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs for state access inside timers/async
    const answersRef = useRef(answers);
    const questionsRef = useRef(questions);

    // Sync Refs
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        questionsRef.current = questions;
    }, [questions]);

    // Timer Logic
    useEffect(() => {
        if (isExamMode && !isCompleted && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        forceFinishExam();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isExamMode, isCompleted, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentQ = questions[currentIndex];

    // Lazy Image Generation (Imagen AI)
    useEffect(() => {
        if (!currentQ) return;

        // Check if question has prompt but NO URL (from DB or Local Cache)
        if (currentQ.image_prompt && !currentQ.image_url && !generatedImages[currentQ.id]) {

            const qId = currentQ.id;
            const dbId = currentQ.db_id;

            setIsGeneratingImage(true);

            // Dynamic import to avoid circular dependency issues if any
            import('../services/geminiService').then(({ generateImage }) => {
                generateImage(currentQ.image_prompt!, courseCode, dbId)
                    .then(url => {
                        setGeneratedImages(prev => ({ ...prev, [qId]: url }));
                    })
                    .catch(err => {
                        console.error("Failed to generate image lazily", err);
                    })
                    .finally(() => {
                        setIsGeneratingImage(false);
                    });
            });
        }
    }, [currentQ, generatedImages, courseCode]);

    // Restore selected option when navigating back/forth
    useEffect(() => {
        if (answers[currentIndex] !== -1) {
            setSelectedOption(answers[currentIndex]);
            // In practice mode, if already answered, show explanation immediately?
            // Maybe not, to allow reviewing without spoilers unless they want to see it?
            // For now: In practice mode, if answered, we can assume it's "checked".
            if (!isExamMode) {
                setShowExplanation(true);
            }
        } else {
            setSelectedOption(null);
            setShowExplanation(false);
        }
    }, [currentIndex, answers, isExamMode]);

    const handleOptionClick = (idx: number) => {
        if (!isExamMode && showExplanation) return; // Prevent changing after revealing
        setSelectedOption(idx);

        // In Exam Mode, selecting updates answer immediately
        if (isExamMode) {
            const newAnswers = [...answers];
            newAnswers[currentIndex] = idx;
            setAnswers(newAnswers);
        }
    };

    const handleCheck = () => {
        if (selectedOption === null) return;

        // Save answer (Practice Mode)
        const newAnswers = [...answers];
        newAnswers[currentIndex] = selectedOption;
        setAnswers(newAnswers);

        // Update running score if correct
        if (questions[currentIndex].correct_index === selectedOption) {
            setScore(prev => prev + 1);
        }

        setShowExplanation(true);
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else if (!isExamMode) {
            // Finish Practice Mode
            finalizeExam();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const changeQuestion = (index: number) => {
        setCurrentIndex(index);
    };

    const handleFinishExam = () => {
        setShowConfirm(true);
    };

    const confirmFinishExam = () => {
        setShowConfirm(false);
        setIsSubmitting(true);
        finalizeExam();
    };

    const forceFinishExam = () => {
        // Auto-submit when time runs out
        finalizeExam();
    };

    const finalizeExam = () => {
        try {
            // 1. Ambil data terbaru dari Ref (untuk menghindari stale closure)
            const currentAnswers = answersRef.current;
            const currentQuestions = questionsRef.current;

            // 2. HITUNG SKOR SECARA LOKAL (INSTANT)
            // Kita tidak perlu AI untuk ini karena kunci jawaban sudah ada di currentQuestions[i].correct_index
            let finalScore = 0;
            if (isExamMode) {
                currentAnswers.forEach((ans, idx) => {
                    if (ans === currentQuestions[idx].correct_index) finalScore++;
                });
            } else {
                finalScore = score; // Kalau practice mode, pakai score yang sudah berjalan
            }

            setScore(finalScore); // Update state score visual

            // 3. Trigger AI Analysis di BACKGROUND (Conditional)
            if (isExamMode) {
                if (canAnalyze) {
                    setIsAnalyzing(true);
                    // Fire and forget (UI tidak nge-freeze)
                    analyzeExamPerformance(currentQuestions, currentAnswers)
                        .then(result => {
                            const combinedAnalysis = result;
                            setAnalysis(combinedAnalysis);
                            if (onComplete) {
                                onComplete(finalScore, currentQuestions.length, combinedAnalysis, currentQuestions, currentAnswers);
                            }
                        })
                        .catch((err) => {
                            console.error("Analysis failed", err);
                            const errMsg = "Maaf, analisis AI gagal dimuat. Namun skor Anda tetap tersimpan.";
                            setAnalysis(errMsg);
                            if (onComplete) {
                                onComplete(finalScore, currentQuestions.length, errMsg, currentQuestions, currentAnswers);
                            }
                        })
                        .finally(() => {
                            setIsAnalyzing(false);
                        });
                } else {
                    // BASIC USER FLOW: Skip AI Analysis
                    const basicMsg = "🔒 **Analisis AI Terkunci**\n\nUpgrade ke **Premium** untuk mendapatkan analisis mendalam tentang kelemahan Anda dan rekomendasi belajar spesifik dari AI Tutor.";
                    setAnalysis(basicMsg);
                    if (onComplete) {
                        onComplete(finalScore, currentQuestions.length, basicMsg, currentQuestions, currentAnswers);
                    }
                }
            }

            // 4. Langsung Ganti Tampilan ke Hasil (Instant Feedback)
            setIsCompleted(true);

        } catch (error) {
            console.error("Critical Error in finalizeExam:", error);
            setIsCompleted(true); // Force complete state to prevent hanging
        } finally {
            setIsSubmitting(false);
        }
    }

    // Scroll to Top Logic
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (isCompleted) {
        // Calculate percentage based on the score state
        const percentage = Math.round((score / questions.length) * 100);
        let message = "";
        let color = "";

        if (percentage >= 80) {
            message = "Luar Biasa! Anda sangat menguasai materi ini.";
            color = "text-green-600 dark:text-green-400";
        } else if (percentage >= 50) {
            message = "Cukup Baik. Tingkatkan lagi belajarnya.";
            color = "text-yellow-600 dark:text-yellow-400";
        } else {
            message = "Perlu Belajar Lagi. Jangan menyerah!";
            color = "text-red-600 dark:text-red-400";
        }

        return (
            <div className="max-w-4xl mx-auto px-4 mt-12 mb-20 animate-in zoom-in duration-300 relative">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-10 text-center mb-8 transition-colors">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className={`w-10 h-10 ${percentage >= 50 ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'}`} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Hasil {modeName}</h2>
                    <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-4">{score} / {questions.length}</div>
                    <p className={`text-lg font-medium ${color} mb-8`}>{message}</p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={onBack}
                            type="button"
                            className="flex items-center justify-center px-6 py-3 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Kembali ke Menu
                        </button>

                        {onRetry && (
                            <button
                                onClick={onRetry}
                                type="button"
                                className="flex items-center justify-center px-6 py-3 bg-blue-600 dark:bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm"
                            >
                                <BrainCircuit className="w-5 h-5 mr-2" />
                                Coba Lagi (Soal Baru)
                            </button>
                        )}
                    </div>
                </div>

                {/* Detailed Review */}
                <div className="space-y-6 mb-8">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Review Jawaban & Pembahasan</h3>
                    {questions.map((q, idx) => {
                        const userAnswer = answers[idx];
                        const isCorrect = userAnswer === q.correct_index;
                        const isSkipped = userAnswer === -1;

                        return (
                            <div key={idx} className={`bg-white dark:bg-slate-800 p-6 rounded-xl border ${isCorrect ? 'border-slate-200 dark:border-slate-700' : 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50'}`}>
                                <div className="flex gap-3 mb-3">
                                    <span className="font-bold text-slate-500 dark:text-slate-400">{idx + 1}.</span>
                                    <div className="font-medium text-slate-900 dark:text-white">
                                        <MarkdownRenderer
                                            content={q.question}
                                            className="[&_p]:m-0 [&_p]:leading-normal [&_p]:inline"
                                        />
                                    </div>
                                </div>
                                <div className="ml-7 text-sm space-y-1 mb-4">
                                    {q.options.map((opt, optIdx) => (
                                        <div key={optIdx} className={`flex items-center gap-2 ${optIdx === q.correct_index ? 'text-green-600 dark:text-green-400 font-bold' : (optIdx === userAnswer ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}`}>
                                            {optIdx === q.correct_index && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                                            {optIdx === userAnswer && optIdx !== q.correct_index && <XCircle className="w-4 h-4 flex-shrink-0" />}
                                            <MarkdownRenderer
                                                content={opt}
                                                className="[&_p]:m-0 [&_p]:leading-normal"
                                            />
                                        </div>
                                    ))}
                                    {isSkipped && <p className="text-orange-500 dark:text-orange-400 italic text-xs">Anda tidak menjawab soal ini.</p>}
                                </div>
                                <div className="ml-7 bg-slate-100 dark:bg-slate-900 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-slate-900 dark:text-white mb-1 block">Penjelasan: </span>
                                    <MarkdownRenderer
                                        content={q.explanation}
                                        className="[&_p]:m-0 [&_p]:leading-relaxed"
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* AI Analysis Section (Only Exam) - MOVED TO BOTTOM */}
                {isExamMode && (
                    <div className="bg-blue-50 dark:bg-slate-800/80 rounded-2xl border border-blue-200 dark:border-slate-700 p-8 mb-8 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <BrainCircuit className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Analisis Kelemahan & Rekomendasi Belajar</h3>
                        </div>

                        {isAnalyzing ? (
                            <div className="flex flex-col py-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                                    <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">Sedang menganalisis jawabanmu...</span>
                                </div>
                                <TextSkeleton lines={5} />
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-left shadow-sm">
                                <MarkdownRenderer content={analysis || "Tidak ada analisis."} className="prose prose-blue dark:prose-invert max-w-none text-slate-700 dark:text-slate-300" />
                            </div>
                        )}
                    </div>
                )}

                {/* Floating Scroll to Top Button */}
                {showScrollTop && (
                    <button
                        onClick={scrollToTop}
                        className="fixed bottom-8 right-8 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all z-50 animate-in fade-in slide-in-from-bottom-4"
                        aria-label="Scroll to top"
                    >
                        <ArrowLeft className="w-6 h-6 rotate-90" />
                    </button>
                )}
            </div>
        );
    }

    // Derived Logic for Button State
    const isLastQuestion = currentIndex === questions.length - 1;
    const showFinishButton = isLastQuestion && isExamMode;

    return (
        <div className="max-w-7xl mx-auto px-4 pb-12 animate-in slide-in-from-right duration-300">

            {/* Header Info Bar */}
            <div className="mb-6 mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-20 z-30 transition-colors">
                <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        {isExamMode && <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                        {modeName}
                    </h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400 hidden md:inline-block mt-1">Pastikan semua soal terjawab sebelum menyelesaikan.</span>
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end w-full md:w-auto">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Soal <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">{currentIndex + 1}</span> / {questions.length}
                    </div>

                    {isExamMode && (
                        <div className={`flex items-center gap-2 font-mono font-bold text-lg px-4 py-1.5 rounded-lg shadow-inner ${timeLeft < 300 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                            <Clock className="w-5 h-5" />
                            {formatTime(timeLeft)}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

                {/* LEFT SIDEBAR (Exam Navigation) - Only visible in Exam Mode or Desktop Practice */}
                {isExamMode && (
                    <div className="lg:col-span-1 order-2 lg:order-1">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sticky top-24 transition-colors">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center justify-between">
                                Navigasi Soal
                                <span className="text-xs font-normal text-slate-400">{answers.filter(a => a !== -1).length} Terjawab</span>
                            </h3>
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((_, idx) => {
                                    const isAnswered = answers[idx] !== -1;
                                    const isCurrent = idx === currentIndex;

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => changeQuestion(idx)}
                                            className={`
                                        aspect-square rounded-lg text-sm font-medium transition-all
                                        ${isCurrent
                                                    ? 'ring-2 ring-blue-600 dark:ring-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold z-10'
                                                    : (isAnswered
                                                        ? 'bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600')
                                                }
                                    `}
                                        >
                                            {idx + 1}
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-600 rounded-sm"></div> Sudah Dijawab
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-slate-100 dark:bg-slate-700 rounded-sm border border-slate-300 dark:border-slate-600"></div> Belum Dijawab
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-2 border-blue-600 dark:border-blue-500"></div> Sedang Dibuka
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MAIN CONTENT (Question Card) */}
                <div className={`${isExamMode ? 'lg:col-span-3' : 'lg:col-span-4'} order-1 lg:order-2`}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[400px] flex flex-col transition-colors">
                        {/* Progress Bar (Visual only) */}
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5">
                            <div
                                className="bg-blue-600 dark:bg-blue-500 h-1.5 transition-all duration-500 ease-out"
                                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                            ></div>
                        </div>

                        <div className="p-8 flex-1">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 leading-relaxed">
                                <MarkdownRenderer content={currentQ.question} />
                            </h3>

                            {/* Image Description / Placeholder */}
                            {/* Image Visual (Imagen AI) */}
                            {(currentQ.image_prompt) && (
                                <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 transition-all">
                                    {(currentQ.image_url || generatedImages[currentQ.id]) ? (
                                        <div className="relative group">
                                            <img
                                                src={currentQ.image_url || generatedImages[currentQ.id]}
                                                alt="Ilustrasi Soal"
                                                className="w-full h-auto max-h-[400px] object-contain mx-auto"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                                                <span className="text-white text-xs opacity-75">Generated by Imagen 3</span>
                                                <button
                                                    onClick={() => window.open(currentQ.image_url || generatedImages[currentQ.id], '_blank')}
                                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 rounded-lg"
                                                    title="Buka Gambar Penuh"
                                                >
                                                    <BrainCircuit className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px] animate-pulse">
                                            <div className="relative">
                                                <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
                                                <BrainCircuit className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                            </div>

                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200">Sedang Menggambar Ilustrasi...</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 italic px-4">AI sedang memvisualisasikan: "{currentQ.image_prompt}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                {currentQ.options.map((option, idx) => {
                                    const isSelected = selectedOption === idx;
                                    const isCorrectOption = idx === currentQ.correct_index;

                                    let containerClass = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600";
                                    let icon = null;

                                    if (!isExamMode && showExplanation) {
                                        // PRACTICE MODE with Explanation Revealed
                                        if (isCorrectOption) {
                                            containerClass = "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 ring-1 ring-green-500 dark:ring-green-700";
                                            icon = <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
                                        } else if (isSelected && !isCorrectOption) {
                                            containerClass = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 ring-1 ring-red-500 dark:ring-red-700";
                                            icon = <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
                                        } else {
                                            containerClass = "border-slate-200 dark:border-slate-700 opacity-60";
                                        }
                                    } else {
                                        // EXAM MODE or Practice before check
                                        if (isSelected) {
                                            containerClass = "bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-500 ring-1 ring-blue-500 dark:ring-blue-500 shadow-sm";
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            disabled={!isExamMode && showExplanation}
                                            onClick={() => handleOptionClick(idx)}
                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${containerClass}`}
                                        >
                                            <span className={`font-medium ${(!isExamMode && showExplanation && isCorrectOption) ? 'text-green-800 dark:text-green-300' : (isSelected && (!showExplanation || isExamMode) ? 'text-blue-800 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300')}`}>
                                                <MarkdownRenderer
                                                    content={option}
                                                    className="[&_p]:m-0 [&_p]:leading-normal"
                                                />
                                            </span>
                                            {icon}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Explanation Panel - ONLY IN PRACTICE MODE */}
                        {!isExamMode && showExplanation && (
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-t border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                                <div className="flex gap-3">
                                    <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Penjelasan & Referensi</h4>
                                        <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                            <MarkdownRenderer
                                                content={currentQ.explanation}
                                                className="[&_p]:m-0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Footer */}
                        <div className="p-5 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center transition-colors">
                            {/* Previous Button */}
                            <button
                                onClick={handlePrev}
                                type="button"
                                disabled={currentIndex === 0}
                                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${currentIndex === 0 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Sebelumnya
                            </button>

                            {/* BUTTON LOGIC: Separated for Clarity */}
                            {showFinishButton ? (
                                <button
                                    type="button"
                                    onClick={handleFinishExam}
                                    disabled={isSubmitting}
                                    className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center group shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Selesaikan Ujian
                                        </>
                                    )}
                                </button>
                            ) : (
                                // NEXT / CHECK ANSWER BUTTON
                                (!isExamMode && !showExplanation) ? (
                                    <button
                                        onClick={handleCheck}
                                        type="button"
                                        disabled={selectedOption === null}
                                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors flex items-center"
                                    >
                                        Cek Jawaban
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center group"
                                    >
                                        {(!isExamMode && currentIndex === questions.length - 1) ? 'Lihat Hasil' : 'Selanjutnya'}
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Confirm Modal */}
            <CustomConfirm
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmFinishExam}
                title="Selesaikan Ujian?"
                message="Apakah Anda yakin ingin menyelesaikan ujian ini? Pastikan semua soal sudah terjawab."
                type="info"
            />
        </div>
    );
};

export default QuizView;
