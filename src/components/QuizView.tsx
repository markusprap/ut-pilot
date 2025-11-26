import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, AlertCircle, ArrowRight, ArrowLeft, Clock, BrainCircuit, Loader2, Save, LayoutGrid } from 'lucide-react';
import { analyzeExamPerformance } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
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
    onRetry
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [score, setScore] = useState(0);
    const [isCompleted, setIsCompleted] = useState(initialIsCompleted);
    const [answers, setAnswers] = useState<number[]>(initialAnswers || new Array(questions.length).fill(-1));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Refs for stale closure fixes (Timer accessing state)
    const answersRef = useRef(answers);
    const questionsRef = useRef(questions);

    // Exam specific states
    const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes in seconds
    const [analysis, setAnalysis] = useState<string | null>(initialAnalysis || null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Sync Refs
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { questionsRef.current = questions; }, [questions]);

    // Reset state when questions change (but respect initial props if provided)
    useEffect(() => {
        if (initialIsCompleted) {
            // If reviewing history, calculate score immediately
            let finalScore = 0;
            const currentAnswers = initialAnswers || new Array(questions.length).fill(-1);
            currentAnswers.forEach((ans, idx) => {
                if (questions[idx] && ans === questions[idx].correct_index) finalScore++;
            });
            setScore(finalScore);
            return;
        }

        setCurrentIndex(0);
        setSelectedOption(null);
        setShowExplanation(false);
        setScore(0);
        setIsCompleted(false);
        setAnswers(new Array(questions.length).fill(-1));
        setTimeLeft(90 * 60);
        setAnalysis(null);
        setIsAnalyzing(false);
        setIsSubmitting(false);
        setShowConfirm(false);
    }, [questions, initialIsCompleted, initialAnswers]);

    const currentQ = questions[currentIndex];

    // Timer Effect for Exam Mode
    useEffect(() => {
        if (!isExamMode || isCompleted) return;

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
    }, [isExamMode, isCompleted]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Helper to switch question and restore state
    const changeQuestion = (index: number) => {
        if (index < 0 || index >= questions.length) return;

        setCurrentIndex(index);

        // Restore state for the target question
        if (isExamMode) {
            const storedAnswer = answers[index];
            setSelectedOption(storedAnswer !== -1 ? storedAnswer : null);
        } else {
            setSelectedOption(null);
            setShowExplanation(false);
        }
    };

    const handleOptionClick = (index: number) => {
        if (showExplanation && !isExamMode) return; // Lock in practice mode if already answered

        setSelectedOption(index);

        // In exam mode, save answer immediately
        if (isExamMode) {
            const newAnswers = [...answers];
            newAnswers[currentIndex] = index;
            setAnswers(newAnswers);
        }
    };

    // Practice Mode only
    const handleCheck = () => {
        if (selectedOption === null) return;

        const newAnswers = [...answers];
        newAnswers[currentIndex] = selectedOption;
        setAnswers(newAnswers);

        if (selectedOption === currentQ.correct_index) {
            setScore(s => s + 1);
        }
        setShowExplanation(true);
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            changeQuestion(currentIndex + 1);
        } else if (!isExamMode) {
            // Fix: Allow finishing practice quiz on last question
            setIsCompleted(true);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            changeQuestion(currentIndex - 1);
        }
    };

    const handleFinishExam = () => {
        setShowConfirm(true);
    }

    const confirmFinishExam = async () => {
        setShowConfirm(false);
        setIsSubmitting(true);

        // Beri jeda sedetik (50ms) agar React sempat render spinner "Memproses..." sebelum logic berat jalan
        await new Promise(resolve => setTimeout(resolve, 50));

        finalizeExam();
    }

    // Called by Timer (no confirmation needed)
    const forceFinishExam = () => {
        setIsSubmitting(true);
        finalizeExam();
    }

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

            // 3. Trigger AI Analysis di BACKGROUND (Jangan tunggu ini selesai baru ganti halaman)
            if (isExamMode) {
                setIsAnalyzing(true);

                // Fire and forget (UI tidak nge-freeze)
                analyzeExamPerformance(currentQuestions, currentAnswers)
                    .then(result => {
                        setAnalysis(result);
                        // Simpan ke history setelah analisis selesai
                        if (onComplete) {
                            onComplete(finalScore, currentQuestions.length, result, currentQuestions, currentAnswers);
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
                                    <p className="font-medium text-slate-900 dark:text-white">{q.question}</p>
                                </div>
                                <div className="ml-7 text-sm space-y-1 mb-4">
                                    {q.options.map((opt, optIdx) => (
                                        <div key={optIdx} className={`flex items-center gap-2 ${optIdx === q.correct_index ? 'text-green-600 dark:text-green-400 font-bold' : (optIdx === userAnswer ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}`}>
                                            {optIdx === q.correct_index && <CheckCircle className="w-4 h-4" />}
                                            {optIdx === userAnswer && optIdx !== q.correct_index && <XCircle className="w-4 h-4" />}
                                            {opt}
                                        </div>
                                    ))}
                                    {isSkipped && <p className="text-orange-500 dark:text-orange-400 italic text-xs">Anda tidak menjawab soal ini.</p>}
                                </div>
                                <div className="ml-7 bg-slate-100 dark:bg-slate-900 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-slate-900 dark:text-white">Penjelasan: </span> {q.explanation}
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
                            <div className="prose prose-blue dark:prose-invert max-w-none bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-left shadow-sm">
                                <ReactMarkdown
                                    components={{
                                        p: ({ node, ...props }) => <p className="text-slate-700 dark:text-slate-300" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 text-slate-700 dark:text-slate-300" {...props} />,
                                        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                    }}
                                >{analysis || "Tidak ada analisis."}</ReactMarkdown>
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
                                {currentQ.question}
                            </h3>

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
                                                {option}
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
                                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{currentQ.explanation}</p>
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
