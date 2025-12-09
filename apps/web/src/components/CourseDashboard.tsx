import React from 'react';
import { Course, ExamHistoryItem } from '../types';
import {
    BookOpen, MessageSquare, GraduationCap, ArrowLeft,
    Clock, History, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getQuotaStatus } from '../services/geminiService';
import { useApp } from '../context/AppContext';

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
    const { userProfile, user } = useApp();
    const [quota, setQuota] = React.useState<{ usage: number, limit: number, remaining: number } | null>(null);

    React.useEffect(() => {
        if (user?.id) {

            getQuotaStatus(user.id).then(data => {
                setQuota(data);
            }).catch(err => {
                console.error("[QUOTA DEBUG] Fetch failed:", err);
            });
        }

    }, [user?.id]);

    const isQuotaEmpty = quota ? quota.remaining <= 0 : false;
    // Check if admin (hardcoded for UI display logic only - backend is source of truth)
    const isAdmin = user?.email && [
        "prapkurniawanmarkus@gmail.com",
        "ut-pilot-admin@ut.ac.id"
    ].includes(user.email);

    // Debug render



    // Calculate progress (mock logic for now, or derived from modules)
    const learnedChapters = Object.keys(course.modules).length;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Navigation */}
            <Button
                variant="ghost"
                onClick={onBack}
                className="mb-8 pl-0 hover:bg-transparent hover:text-primary gap-2"
            >
                <ArrowLeft className="w-5 h-5" /> Kembali ke Daftar Kelas
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT COLUMN (Sidebar) */}
                <div className="lg:col-span-4 space-y-6">



                    {/* Let's try a standard Card approach for the sidebar info to match the user's request for light mode correctness */}
                    {/* Re-writing the above card to be standard responsive */}
                    <Card className="overflow-hidden bg-card text-card-foreground shadow-md">
                        <CardHeader className="pb-2">
                            <Badge variant="secondary" className="w-fit mb-2 font-mono">
                                {course.code}
                            </Badge>
                            <CardTitle className="text-xl leading-tight">{course.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-sm mb-6 line-clamp-2">{course.fileName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                                <BookOpen className="w-4 h-4 text-primary" />
                                <span>{learnedChapters} Bab Dipelajari</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Exam History Card */}
                    <Card className="h-fit shadow-md">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-primary" />
                                <CardTitle className="text-lg">Riwayat Simulasi UAS</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {course.examHistory && course.examHistory.length > 0 ? (
                                <div className="space-y-3">
                                    {course.examHistory.slice().reverse().slice(0, 3).map((history) => (
                                        <div
                                            key={history.id}
                                            onClick={() => onViewHistory(history)}
                                            className="bg-muted/50 p-3 rounded-xl border flex justify-between items-center cursor-pointer hover:bg-muted transition-colors group"
                                        >
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">
                                                    {new Date(history.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="font-bold text-sm">
                                                    Skor: <span className={history.score >= 80 ? 'text-green-600 dark:text-green-400' : history.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}>{history.score}</span> / {history.totalQuestions}
                                                </div>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center font-bold text-xs group-hover:border-primary transition-colors">
                                                {Math.round((history.score / history.totalQuestions) * 100)}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="border border-dashed rounded-xl p-8 text-center text-muted-foreground bg-muted/20">
                                    <p className="text-sm">Belum ada riwayat ujian.</p>
                                </div>
                            )}
                            <div className="mt-6 pt-4 border-t flex justify-center">
                                {isAdmin ? (
                                    <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">Unlimited (Admin)</Badge>
                                ) : (
                                    quota ? (
                                        <Badge variant={isQuotaEmpty ? "destructive" : "secondary"} className={!isQuotaEmpty ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}>
                                            Sisa Token: {quota.remaining}/{quota.limit}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs text-slate-500">Checking...</Badge>
                                    )
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN (Main Actions) */}
                <div className="lg:col-span-8 space-y-5">

                    {/* 1. Study Session */}
                    <Card
                        onClick={onOpenStudySession}
                        className="group hover:border-blue-500/50 cursor-pointer transition-all shadow-md hover:shadow-lg relative overflow-hidden"
                    >
                        <CardContent className="p-6 flex items-start gap-6">
                            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                <BookOpen className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Mulai Belajar (Materi & PDF)</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Pelajari materi per modul dengan Smart Notes, Latihan Soal, dan baca PDF Modul Asli di satu tempat.
                                </p>
                            </div>
                            <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0">
                                <ChevronRight className="w-6 h-6 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Community Forum */}
                    <Card
                        onClick={onOpenDiscussion}
                        className="group hover:border-purple-500/50 cursor-pointer transition-all shadow-md hover:shadow-lg relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0">
                            <Badge className="rounded-none rounded-bl-xl bg-purple-600 hover:bg-purple-700">KOMUNITAS</Badge>
                        </div>
                        <CardContent className="p-6 flex items-start gap-6">
                            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                <MessageSquare className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Forum Diskusi Kelas</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Tanya jawab dan diskusi dengan mahasiswa lain yang mengambil mata kuliah ini se-Indonesia. 100% Interaksi Manusia.
                                </p>
                            </div>
                            <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0">
                                <ChevronRight className="w-6 h-6 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Exam Simulation */}
                    <Card
                        onClick={onStartExam}
                        className="group hover:border-yellow-500/50 cursor-pointer transition-all shadow-md hover:shadow-lg relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0">
                            <Badge className="rounded-none rounded-bl-xl bg-yellow-500 text-slate-900 hover:bg-yellow-600">SOAL BARU SETIAP SESI</Badge>
                        </div>
                        <CardContent className="p-6 flex items-start gap-6">
                            <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                <GraduationCap className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">Simulasi Ujian Akhir (UAS)</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                                    Tes kesiapanmu dengan 45 soal acak dari seluruh materi modul. Soal akan digenerate baru oleh AI setiap kali Anda memulai sesi ini.
                                </p>
                                <div className="inline-flex items-center gap-4 bg-muted/50 rounded-lg px-4 py-2 text-xs text-muted-foreground border">
                                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Soal tidak disimpan di cache</span>
                                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                                    <span>Hasil ujian disimpan di Riwayat</span>
                                </div>
                            </div>
                            <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0">
                                <ChevronRight className="w-6 h-6 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
};

export default CourseDashboard;
