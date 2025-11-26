import React from 'react';
import { Course, ExamHistoryItem } from '../types';
import {
    BookOpen, MessageSquare, GraduationCap, ArrowLeft,
    Clock, History, FileText, ChevronRight, Sparkles
} from 'lucide-react';

interface CourseDashboardProps {
    course: Course;
    onBack: () => void;
    onOpenStudySession: () => void;
    onOpenDiscussion: () => void;
    onStartExam: () => void;
    onViewHistory: (item: ExamHistoryItem) => void;
}

const CourseDashboard: React.FC<CourseDashboardProps> = ({
    course,
    onBack,
    onOpenStudySession,
    onOpenDiscussion,
    onStartExam,
    onViewHistory
}) => {

    // Calculate progress (mock logic for now, or derived from modules)
    const learnedChapters = Object.keys(course.modules).length;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Navigation */}
            <button
                onClick={onBack}
                className="mb-8 flex items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium"
            >
                <ArrowLeft className="w-5 h-5 mr-2" /> Kembali ke Daftar Kelas
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT COLUMN (Sidebar) */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Course Info Card */}
                    <div className="bg-slate-800 text-white rounded-2xl p-6 shadow-lg border border-slate-700 relative overflow-hidden">
                        <div className="relative z-10">
                            <span className="inline-block bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-bold px-2 py-1 rounded mb-3">
                                {course.code}
                            </span>
                            <h1 className="text-2xl font-bold mb-2 leading-tight">{course.title}</h1>
                            <p className="text-slate-400 text-sm mb-6 line-clamp-2">{course.fileName}</p>

                            <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-700/50 p-3 rounded-lg">
                                <BookOpen className="w-4 h-4 text-blue-400" />
                                <span>{learnedChapters} Bab Dipelajari</span>
                            </div>
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    </div>

                    {/* Exam History Card */}
                    <div className="bg-slate-800 text-white rounded-2xl p-6 shadow-lg border border-slate-700 h-fit">
                        <div className="flex items-center gap-3 mb-6">
                            <History className="w-5 h-5 text-blue-400" />
                            <h3 className="font-bold text-lg">Riwayat Simulasi UAS</h3>
                        </div>

                        {course.examHistory && course.examHistory.length > 0 ? (
                            <div className="space-y-3">
                                {course.examHistory.slice().reverse().slice(0, 3).map((history) => (
                                    <div
                                        key={history.id}
                                        onClick={() => onViewHistory(history)}
                                        className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 flex justify-between items-center cursor-pointer hover:bg-slate-700 transition-colors group"
                                    >
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1 group-hover:text-slate-300">
                                                {new Date(history.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="font-bold text-white">
                                                Skor: <span className={history.score >= 80 ? 'text-green-400' : history.score >= 50 ? 'text-yellow-400' : 'text-red-400'}>{history.score}</span> / {history.totalQuestions}
                                            </div>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center font-bold text-sm group-hover:bg-slate-500 transition-colors">
                                            {Math.round((history.score / history.totalQuestions) * 100)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="border border-dashed border-slate-600 rounded-xl p-8 text-center text-slate-400 bg-slate-700/20">
                                <p className="text-sm">Belum ada riwayat ujian.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN (Main Actions) */}
                <div className="lg:col-span-8 space-y-5">

                    {/* 1. Study Session */}
                    <div
                        onClick={onOpenStudySession}
                        className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-blue-500/50 rounded-2xl p-6 cursor-pointer transition-all shadow-lg relative overflow-hidden"
                    >
                        <div className="flex items-start gap-6 relative z-10">
                            <div className="w-14 h-14 bg-blue-900/30 text-blue-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                <BookOpen className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Mulai Belajar (Materi & PDF)</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Pelajari materi per modul dengan Smart Notes, Latihan Soal, dan baca PDF Modul Asli di satu tempat.
                                </p>
                            </div>
                            <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0">
                                <ChevronRight className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* 2. Discussion Partner */}
                    <div
                        onClick={onOpenDiscussion}
                        className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-purple-500/50 rounded-2xl p-6 cursor-pointer transition-all shadow-lg relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0">
                            <span className="bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">FITUR BARU</span>
                        </div>
                        <div className="flex items-start gap-6 relative z-10">
                            <div className="w-14 h-14 bg-purple-900/30 text-purple-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                <MessageSquare className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Partner Diskusi Tuton</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Bantuan riset & sintesis untuk menjawab diskusi online (Tuton). Masukkan soal, AI bantu cari referensi, kamu susun poinnya.
                                </p>
                            </div>
                            <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0">
                                <ChevronRight className="w-6 h-6 text-purple-500" />
                            </div>
                        </div>
                    </div>

                    {/* 3. Exam Simulation */}
                    <div
                        onClick={onStartExam}
                        className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-yellow-500/50 rounded-2xl p-6 cursor-pointer transition-all shadow-lg relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0">
                            <span className="bg-yellow-500 text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl-xl">SOAL BARU SETIAP SESI</span>
                        </div>
                        <div className="flex items-start gap-6 relative z-10">
                            <div className="w-14 h-14 bg-yellow-900/20 text-yellow-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                <GraduationCap className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">Simulasi Ujian Akhir (UAS)</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                    Tes kesiapanmu dengan 45 soal acak dari seluruh materi modul. Soal akan digenerate baru oleh AI setiap kali Anda memulai sesi ini.
                                </p>
                                <div className="inline-flex items-center gap-4 bg-slate-900/50 rounded-lg px-4 py-2 text-xs text-slate-500 border border-slate-700/50">
                                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Soal tidak disimpan di cache</span>
                                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                    <span>Hasil ujian disimpan di Riwayat</span>
                                </div>
                            </div>
                            <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0">
                                <ChevronRight className="w-6 h-6 text-yellow-500" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CourseDashboard;
