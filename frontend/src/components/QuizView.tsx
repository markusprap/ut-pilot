import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface QuizViewProps {
  questions: QuizQuestion[];
  onBack: () => void;
}

const QuizView: React.FC<QuizViewProps> = ({ questions, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));

  // Reset state when questions change
  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setScore(0);
    setIsCompleted(false);
    setAnswers(new Array(questions.length).fill(-1));
  }, [questions]);

  const currentQ = questions[currentIndex];

  const handleOptionClick = (index: number) => {
    if (showExplanation) return; // Lock if already answered
    setSelectedOption(index);
  };

  const handleCheck = () => {
    if (selectedOption === null) return;
    
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedOption;
    setAnswers(newAnswers);

    if (selectedOption === currentQ.correct_index) {
      setScore(s => s + 1);
    }
    setShowExplanation(true);

    // Auto-finish if last question
    if (currentIndex === questions.length - 1) {
      setTimeout(() => setIsCompleted(true), 500);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    }
  };

  if (isCompleted) {
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
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Hasil Latihan Kuis</h2>
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
                </div>
                <div className="ml-7 bg-slate-100 p-3 rounded-lg text-sm text-slate-700">
                  <span className="font-bold">Penjelasan: </span> {q.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12 animate-in slide-in-from-right duration-300">
      
      {/* Header Info Bar */}
      <div className="mb-6 mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-20 z-30">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Latihan Kuis
          </h2>
          <span className="text-xs text-slate-500 hidden md:inline-block mt-1">Jawab soal dengan teliti dan pelajari penjelasannya.</span>
        </div>
        
        <div className="text-sm font-medium text-slate-700">
          Soal <span className="text-blue-600 font-bold text-lg">{currentIndex + 1}</span> / {questions.length}
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden min-h-[400px] flex flex-col">
        {/* Progress Bar */}
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
              const isCorrectOption = idx === currentQ.correct_index;
              
              let containerClass = "border-slate-200 hover:bg-slate-50 hover:border-slate-300";
              let icon = null;

              if (showExplanation) {
                // Show correct/incorrect after checking
                if (isCorrectOption) {
                  containerClass = "bg-green-50 border-green-200 ring-1 ring-green-500";
                  icon = <CheckCircle className="w-5 h-5 text-green-600" />;
                } else if (isSelected && !isCorrectOption) {
                  containerClass = "bg-red-50 border-red-200 ring-1 ring-red-500";
                  icon = <XCircle className="w-5 h-5 text-red-600" />;
                } else {
                  containerClass = "border-slate-200 opacity-60";
                }
              } else {
                // Before checking - just show selection
                if (isSelected) {
                  containerClass = "bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-sm";
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={showExplanation}
                  onClick={() => handleOptionClick(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${containerClass}`}
                >
                  <span className={`font-medium ${(showExplanation && isCorrectOption) ? 'text-green-800' : (isSelected && !showExplanation ? 'text-blue-800' : 'text-slate-700')}`}>
                    {option}
                  </span>
                  {icon}
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation Panel */}
        {showExplanation && (
          <div className="bg-slate-50 p-6 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Penjelasan & Referensi</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{currentQ.explanation}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end items-center">
          {!showExplanation ? (
            <button
              onClick={handleCheck}
              type="button"
              disabled={selectedOption === null}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center"
            >
              Cek Jawaban
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center group"
            >
              {currentIndex === questions.length - 1 ? 'Lihat Hasil' : 'Selanjutnya'}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizView;
