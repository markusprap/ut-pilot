
import React from 'react';
import { ArrowRight, BookOpen, BrainCircuit, GraduationCap, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col bg-gradient-to-b from-white to-slate-50">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 md:py-24 text-center max-w-4xl mx-auto">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Versi Beta v1.0 (2025)
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          Belajar Mandiri <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
             Lebih Cerdas & Efektif.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          UT-Pilot mengubah Modul Digital (PDF) Universitas Terbuka Anda menjadi ringkasan cerdas, kuis interaktif, dan simulasi ujian UAS berbasis AI.
        </p>

        <button 
          onClick={onStart}
          className="group relative flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-600 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300"
        >
          Mulai Sekarang
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="mt-6 text-xs text-slate-400 font-medium flex items-center gap-2 animate-in fade-in duration-1000 delay-500">
          <ShieldCheck className="w-3 h-3" /> Privasi Terjaga. Tidak perlu login/daftar.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="w-full max-w-5xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Notes</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            AI meringkas setiap Kegiatan Belajar (KB) menjadi poin-poin penting yang mudah dipahami.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
            <BrainCircuit className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Latihan Soal</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Bank soal tak terbatas untuk setiap modul. Latihan terus menerus sampai paham konsepnya.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center mb-4">
            <GraduationCap className="w-6 h-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Simulasi UAS</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Uji kesiapan Anda dengan 45 soal acak dari seluruh materi modul. Lengkap dengan analisis skor.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
