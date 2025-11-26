import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, AlertCircle, ArrowRight, ArrowLeft, Clock, BrainCircuit, Loader2, Save, LayoutGrid } from 'lucide-react';
import { analyzeExamPerformance } from '../services/apiService';

interface ExamViewProps {
  questions: QuizQuestion[];
  onBack: () => void;
  onComplete: (score: number, total: number, analysis: string, questions: QuizQuestion[], userAnswers: number[]) => void;
}

const ExamView: React.FC<ExamViewProps> = ({ questions, onBack, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs for stale closure fixes (Timer accessing state)
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);

  // Exam specific states
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes in seconds
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Sync Refs
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  // Reset state when questions change
  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsCompleted(false);
    setAnswers(new Array(questions.length).fill(-1));
    setTimeLeft(90 * 60);
    setAnalysis(null);
    setIsAnalyzing(false);
    setIsSubmitting(false);
  }, [questions]);

  const currentQ = questions[currentIndex];

  // Force Finish Exam Function (defined here so it's accessible by timer)
  const forceFinishExam = useRef<(() => void) | null>(null);

  // Timer Effect for Exam Mode
  useEffect(() => {
    if (isCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (forceFinishExam.current) {
            forceFinishExam.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCompleted]);

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
    const storedAnswer = answers[index];
    setSelectedOption(storedAnswer !== -1 ? storedAnswer : null);
  };

  const handleOptionClick = (index: number) => {
    setSelectedOption(index);
    
    // Save answer immediately
    const newAnswers = [...answers];
    newAnswers[currentIndex] = index;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      changeQuestion(currentIndex + 1);
    } 
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      changeQuestion(currentIndex - 1);
    }
  };

  const finalizeExam = () => {
    // Guard against double execution
    if (isCompleted) return;
    
    try {
      // 1. Ambil data terbaru dari Ref (untuk menghindari stale closure)
      const currentAnswers = answersRef.current;
      const currentQuestions = questionsRef.current;

      // 2. HITUNG SKOR SECARA LOKAL (INSTANT)
      let finalScore = 0;
      currentAnswers.forEach((ans, idx) => {
        if (ans === currentQuestions[idx].correct_index) finalScore++;
      });
      
      setScore(finalScore); // Update state score visual

      // 3. Trigger AI Analysis di BACKGROUND
      setIsAnalyzing(true);
      
      // Fire and forget (UI tidak nge-freeze)
      analyzeExamPerformance(currentQuestions, currentAnswers)
        .then(result => {
          setAnalysis(result);
          // Simpan ke history setelah analisis selesai
          onComplete(finalScore, currentQuestions.length, result, currentQuestions, currentAnswers);
        })
        .catch((err) => {
          console.error("Analysis failed", err);
          const errMsg = "Maaf, analisis AI gagal dimuat. Namun skor Anda tetap tersimpan.";
          setAnalysis(errMsg);
          onComplete(finalScore, currentQuestions.length, errMsg, currentQuestions, currentAnswers);
        })
        .finally(() => {
          setIsAnalyzing(false);
        });
      
      // 4. Langsung Ganti Tampilan ke Hasil (Instant Feedback)
      setIsCompleted(true);
      
    } catch (error) {
      console.error("Critical Error in finalizeExam:", error);
      setIsCompleted(true); // Force complete state to prevent hanging
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishExam = () => {
    // Prevent double submission
    if (isSubmitting || isCompleted) return;
    
    // Show custom confirmation modal
    setShowConfirmModal(true);
  };

  const confirmFinishExam = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    
    // Beri jeda sedetik (50ms) agar React sempat render spinner "Memproses..." sebelum logic berat jalan
    await new Promise(resolve => setTimeout(resolve, 50));
    
    finalizeExam();
  };

  // Assign forceFinishExam to ref so timer can call it
  useEffect(() => {
    forceFinishExam.current = () => {
      if (isSubmitting || isCompleted) return;
      setIsSubmitting(true);
      finalizeExam();
    };
  }, [isSubmitting, isCompleted]);

  if (isCompleted) {
    // Calculate percentage based on the score state
    const percentage = Math.round((score / questions.length) * 100);
    let message = "";
    let color = "";

    if (percentage >= 80) {
      message = "Luar Biasa! Anda sangat menguasai materi ini.";
      color = "text-green-600";
    } else if (percentage >= 50) {
      message = "Cukup Baik. Tingkatkan lagi belajarnya.";
      color = "text-yellow-600";
    } else {
      message = "Perlu Belajar Lagi. Jangan menyerah!";
      color = "text-red-600";
    }

    return (
      <div className="max-w-4xl mx-auto px-4 mt-12 mb-20 animate-in zoom-in duration-300">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 text-center mb-8">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle className={`w-10 h-10 ${percentage >= 50 ? 'text-green-500' : 'text-slate-400'}`} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Hasil Ujian Simulasi</h2>
          <div className="text-5xl font-bold text-blue-600 mb-4">{score} / {questions.length}</div>
          <p className={`text-lg font-medium ${color} mb-8`}>{message}</p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={onBack}
              type="button"
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Kembali ke Menu
            </button>
          </div>
        </div>

        {/* Detailed Review */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Review Jawaban & Pembahasan</h3>
          {questions.map((q, idx) => {
            const userAnswer = answers[idx];
            const isCorrect = userAnswer === q.correct_index;
            const isSkipped = userAnswer === -1;

            return (
              <div key={idx} className={`bg-white p-6 rounded-xl border ${isCorrect ? 'border-slate-200' : 'border-red-200 bg-red-50'}`}>
                <div className="flex gap-3 mb-3">
                  <span className="font-bold text-slate-500">{idx + 1}.</span>
                  <p className="font-medium text-slate-900">{q.question}</p>
                </div>
                <div className="ml-7 text-sm space-y-1 mb-4">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className={`flex items-center gap-2 ${optIdx === q.correct_index ? 'text-green-600 font-bold' : (optIdx === userAnswer ? 'text-red-600' : 'text-slate-500')}`}>
                      {optIdx === q.correct_index && <CheckCircle className="w-4 h-4" />}
                      {optIdx === userAnswer && optIdx !== q.correct_index && <XCircle className="w-4 h-4" />}
                      {opt}
                    </div>
                  ))}
                  {isSkipped && <p className="text-orange-500 italic text-xs">Anda tidak menjawab soal ini.</p>}
                </div>
                <div className="ml-7 bg-slate-100 p-3 rounded-lg text-sm text-slate-700">
                  <span className="font-bold">Penjelasan: </span> {q.explanation}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Analysis Section - MOVED TO BOTTOM */}
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-8 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <BrainCircuit className="w-8 h-8 text-blue-600" />
            <h3 className="text-xl font-bold text-slate-900">Analisis Kelemahan & Rekomendasi Belajar AI</h3>
          </div>
          
          {isAnalyzing ? (
            <div className="flex flex-col items-center py-8 bg-white rounded-xl border border-slate-200 border-dashed">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-slate-600 font-medium">AI sedang menganalisis jawaban Anda...</p>
              <p className="text-slate-400 text-sm mt-1">(Hasil ujian sudah aman tersimpan)</p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-left shadow-sm">
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{analysis || "Tidak ada analisis."}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <>
      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200">
            <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 text-center mb-3">
              Selesaikan Ujian?
            </h3>
            <p className="text-slate-600 text-center mb-6">
              Pastikan Anda sudah menjawab semua soal. Setelah dikumpulkan, Anda tidak bisa mengubah jawaban lagi.
            </p>
            <div className="flex items-center justify-center gap-3 text-sm mb-6 bg-slate-50 p-3 rounded-lg">
              <span className="text-slate-500">Soal Terjawab:</span>
              <span className="font-bold text-blue-600">{answers.filter(a => a !== -1).length} / {questions.length}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmFinishExam}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm"
              >
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 pb-12 animate-in slide-in-from-right duration-300">
      
        {/* Header Info Bar */}
        <div className="mb-6 mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-20 z-30">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-blue-600" />
              Ujian Simulasi
            </h2>
            <span className="text-xs text-slate-500 hidden md:inline-block mt-1">Pastikan semua soal terjawab sebelum menyelesaikan.</span>
          </div>
          
          <div className="flex items-center gap-4 justify-between md:justify-end w-full md:w-auto">
            <div className="text-sm font-medium text-slate-700">
              Soal <span className="text-blue-600 font-bold text-lg">{currentIndex + 1}</span> / {questions.length}
            </div>

            <div className={`flex items-center gap-2 font-mono font-bold text-lg px-4 py-1.5 rounded-lg shadow-inner ${timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* LEFT SIDEBAR (Exam Navigation) */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-44">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center justify-between">
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
                          ? 'ring-2 ring-blue-600 bg-blue-50 text-blue-700 font-bold z-10' 
                          : (isAnswered 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                        }
                      `}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-sm"></div> Sudah Dijawab
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-100 rounded-sm border border-slate-300"></div> Belum Dijawab
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-50 rounded-sm border-2 border-blue-600"></div> Sedang Dibuka
                </div>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT (Question Card) */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden min-h-[400px] flex flex-col">
              {/* Progress Bar (Visual only) */}
              <div className="w-full bg-slate-100 h-1.5">
                <div 
                  className="bg-blue-600 h-1.5 transition-all duration-500 ease-out"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                ></div>
              </div>

              <div className="p-8 flex-1">
                <h3 className="text-xl font-semibold text-slate-900 mb-6 leading-relaxed">
                  {currentQ.question}
                </h3>

                <div className="space-y-3">
                  {currentQ.options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    let containerClass = "border-slate-200 hover:bg-slate-50 hover:border-slate-300";

                    if (isSelected) {
                      containerClass = "bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-sm";
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleOptionClick(idx)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${containerClass}`}
                      >
                        <span className={`font-medium ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>
                          {option}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                {/* Previous Button */}
                <button
                  onClick={handlePrev}
                  type="button"
                  disabled={currentIndex === 0}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${currentIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Sebelumnya
                </button>

                {/* Finish or Next Button */}
                {isLastQuestion ? (
                  <button
                    type="button"
                    onClick={handleFinishExam}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center group shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
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
                  <button
                    type="button"
                    onClick={handleNext}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center group"
                  >
                    Selanjutnya
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExamView;
