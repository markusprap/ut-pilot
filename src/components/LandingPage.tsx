import React from 'react';
import { ArrowRight, BookOpen, BrainCircuit, GraduationCap, ShieldCheck, Sun, Moon, MessageSquare, StickyNote, Sparkles, Heart, Coffee, CheckCircle2, Zap, Users } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, isDarkMode, toggleTheme }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 transition-colors duration-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 rounded-lg p-1.5">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">UT-Pilot</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-blob"></div>
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-400/20 dark:bg-pink-600/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wide mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            New: AI Tutor & Discussion Partner
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Belajar Lebih Cerdas, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              Bukan Lebih Keras.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-400 mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            Platform belajar all-in-one untuk mahasiswa UT. Upload modul, dapatkan rangkuman instan, latihan soal adaptif, dan bimbingan personal dari AI Tutor.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
            <button
              onClick={onStart}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Coba Gratis Sekarang
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            <a
              href="#features"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm hover:shadow-md"
            >
              Pelajari Fitur
            </a>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400 animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Tanpa Login Ribet</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Privasi Data Terjamin</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Gratis Selamanya</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Fitur Unggulan</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Semua yang Anda butuhkan untuk sukses di UT ada di sini.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Smart Summary</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Ubah modul PDF tebal menjadi ringkasan poin-poin penting yang mudah dipahami dalam hitungan detik.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-6">
                <GraduationCap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Exam Simulation</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Latihan soal UAS dengan format yang mirip aslinya. Dilengkapi timer dan analisis performa instan.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">NEW</div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">AI Tutor Chat</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Tanya jawab interaktif dengan AI tentang materi modul yang sulit dipahami, 24/7 tanpa henti.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Partner Diskusi</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Bantuan riset untuk menjawab diskusi Tuton. Cari referensi valid dan susun argumen dengan bantuan AI.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Instant Feedback</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Dapatkan umpan balik langsung setelah mengerjakan kuis untuk mengetahui area mana yang perlu ditingkatkan.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Privacy First</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Data Anda tersimpan lokal di browser. Kami tidak menyimpan file modul atau data pribadi Anda di server.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">Siap Meningkatkan Nilai IPK Anda?</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">Bergabunglah dengan ribuan mahasiswa UT lainnya yang belajar lebih cerdas dengan UT-Pilot.</p>
          <button
            onClick={onStart}
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Mulai Belajar Sekarang
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-10 mt-auto transition-colors">
        <div className="max-w-5xl mx-auto px-4 flex flex-col items-center text-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-900 dark:text-slate-200 font-semibold text-sm">© 2025 UT-Pilot. Asisten Belajar Cerdas.</p>

            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              Made with
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              and
              <Coffee className="w-4 h-4 text-amber-700 dark:text-amber-500" />
              by
              <a href="https://www.instagram.com/markusprap/" target="_blank" rel="noreferrer" className="font-medium text-slate-900 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 underline decoration-slate-300 dark:decoration-slate-600 hover:decoration-blue-500 transition-all">
                Markus Prap Kurniawan
              </a>
            </div>
          </div>

          <a
            href="https://teer.id/programmergenz"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
          >
            Dukung Pengembangan Aplikasi Ini
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
