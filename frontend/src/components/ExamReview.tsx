import React from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

interface ExamReviewProps {
  questions: QuizQuestion[];
  userAnswers: number[];
  score: number;
  date: number;
  analysisSummary: string;
  onBack: () => void;
}

const ExamReview: React.FC<ExamReviewProps> = ({ 
  questions, 
  userAnswers, 
  score, 
  date,
  analysisSummary,
  onBack 
}) => {
  // Handle old history data without questions
  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 mt-12 mb-20">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Review Tidak Tersedia</h2>
          <p className="text-slate-600 mb-8">
            Riwayat ujian lama tidak menyimpan detail soal dan pembahasan. 
            Hanya ujian yang baru saja selesai yang bisa di-review secara detail.
          </p>
          <button 
            onClick={onBack}
            type="button"
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm mx-auto"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

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
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Review Ujian Simulasi</h2>
        <p className="text-sm text-slate-500 mb-4">
          {new Date(date).toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
        <div className="text-5xl font-bold text-blue-600 mb-4">{score} / {questions.length}</div>
        <p className={`text-lg font-medium ${color} mb-8`}>{message}</p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={onBack}
            type="button"
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Kembali ke Dashboard
          </button>
        </div>
      </div>

      {/* Detailed Review */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-900">Review Jawaban & Pembahasan</h3>
        {questions.map((q, idx) => {
          const userAnswer = userAnswers[idx];
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

      {/* AI Analysis Section */}
      {analysisSummary && (
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-8 mt-8">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Analisis Kelemahan & Rekomendasi Belajar</h3>
          <div className="bg-white p-6 rounded-xl border border-slate-200 text-left shadow-sm">
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">{analysisSummary}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamReview;
