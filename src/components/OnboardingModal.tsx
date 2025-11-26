import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle, Upload, BookOpen, MessageSquare, Users, Sparkles, User } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: (name: string) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState("");

  if (!isOpen) return null;

  const steps = [
    {
      icon: Sparkles,
      title: `Selamat Datang di UT-Pilot!`,
      description: 'Asisten belajar cerdas khusus untuk mahasiswa Universitas Terbuka.',
      content: (
        <div className="space-y-6">
          {/* Name Input */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Siapa nama panggilanmu?
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Nama ini hanya tersimpan di browser kamu untuk personalisasi AI.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
            <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Apa yang bisa UT-Pilot lakukan?
            </h4>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>Membuat <strong>rangkuman otomatis</strong> dari modul PDF</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>Generate <strong>bank soal latihan</strong> per modul</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>Simulasi <strong>UAS 45 soal</strong> dengan analisis AI</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span><strong>Chat dengan AI Tutor</strong> saat belajar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>Bantu <strong>jawab diskusi forum</strong> dengan referensi</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      icon: Upload,
      title: 'Langkah 1: Upload Modul PDF',
      description: 'Mulai dengan upload modul UT Anda',
      content: (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Klik "Buat Kelas Baru"</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Berikan nama mata kuliah (contoh: "Pengantar Akuntansi")
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Upload File PDF</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Pilih modul PDF dari komputer Anda (max 50MB)
                </p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              <strong>💡 Tips:</strong> File akan diproses oleh Google AI. Proses bisa memakan waktu 30-60 detik tergantung ukuran file.
            </p>
          </div>
        </div>
      )
    },
    {
      icon: BookOpen,
      title: 'Langkah 2: Pilih Mode Belajar',
      description: 'Ada 2 mode utama untuk belajar',
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h4 className="font-bold text-slate-900 dark:text-white">Study Session</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Mode belajar per modul/bab dengan fitur:
            </p>
            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300 ml-4">
              <li>• Smart Notes (3 mode kesulitan)</li>
              <li>• Bank Soal 30-40 soal</li>
              <li>• Chat AI Tutor</li>
              <li>• PDF Viewer + Notes</li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-5 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              <h4 className="font-bold text-slate-900 dark:text-white">Exam Simulation</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Simulasi UAS dengan 45 soal dari semua modul + timer + analisis AI
            </p>
          </div>
        </div>
      )
    },
    {
      icon: MessageSquare,
      title: 'Fitur Baru: AI Tutor & Partner Diskusi',
      description: 'Dua fitur powerful untuk bantu belajar',
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h4 className="font-bold text-slate-900 dark:text-white">AI Tutor Chat</h4>
              <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">NEW</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Bingung dengan materi? Langsung tanya AI Tutor:
            </p>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg text-xs text-slate-600 dark:text-slate-400 italic border border-blue-100 dark:border-blue-900">
              "Jelaskan konsep inflasi dengan analogi sederhana"
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-5 rounded-xl border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h4 className="font-bold text-slate-900 dark:text-white">Partner Diskusi</h4>
              <span className="bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">NEW</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              "Mas Aldi" bantu jawab diskusi forum dengan:
            </p>
            <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 ml-4">
              <li>• Riset otomatis dari internet</li>
              <li>• Referensi valid (APA Style)</li>
              <li>• Racikan jawaban akademis</li>
              <li>• Simpan per sesi diskusi</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      icon: CheckCircle,
      title: 'Siap Mulai Belajar!',
      description: 'Semua data tersimpan aman di browser Anda',
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Halo, {name || "Mahasiswa"}! Kamu Sudah Siap!</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Klik "Mulai Belajar" untuk membuat kelas pertama Anda
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-sm">📌 Catatan Penting:</h4>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <li>• Semua data tersimpan di browser (IndexedDB + localStorage)</li>
              <li>• File PDF diproses oleh Google Gemini AI</li>
              <li>• Tidak ada data yang dikirim ke server kami</li>
              <li>• Gratis selamanya untuk mahasiswa UT</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <button
            onClick={() => onClose("")} // Pass empty string to indicate cancellation
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
              <p className="text-blue-100 text-sm mt-1">{currentStepData.description}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-100 dark:bg-slate-900 px-6 py-3">
          <div className="flex items-center gap-2">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-all ${idx <= currentStep
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600'
                  : 'bg-slate-300 dark:bg-slate-700'
                  }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
            Langkah {currentStep + 1} dari {steps.length}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-3 justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => {
                if (currentStep === 0 && !name.trim()) {
                  // Optional: Shake animation or alert if name is empty
                  // For now just proceed, we default to "Mahasiswa"
                }
                setCurrentStep(currentStep + 1)
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              Lanjut
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onClose(name || "Mahasiswa")}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Mulai Belajar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;