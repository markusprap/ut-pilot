import React from 'react';
import {
    MessageSquare, Search, PenTool, FileCheck, ArrowRight,
    Loader2, ExternalLink, ArrowLeft, Save, BookOpen, Trash2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Skeleton, TextSkeleton } from './Skeleton';
import { CustomAlert, CustomConfirm } from './CustomModal';
import { useDiscussion } from '../hooks/useDiscussion';

interface DiscussionPartnerProps {
    courseName: string;
    onBack: () => void;
    userName?: string;
}

const DiscussionPartner: React.FC<DiscussionPartnerProps> = ({ courseName, onBack, userName = "Mahasiswa" }) => {
    const {
        step, setStep,
        isLoading,
        sessionNumber, setSessionNumber,
        question, setQuestion,
        researchData,
        userPoints, setUserPoints,
        finalAnswer,
        savedDiscussions,
        alert, setAlert,
        confirm, setConfirm,
        messagesEndRef,
        saveDiscussion,
        loadDiscussion,
        deleteDiscussion,
        handleResearch,
        handleFinalize,
        startNewDiscussion,
        resetAll
    } = useDiscussion(courseName, userName);

    // Style Configuration for ReactMarkdown
    const markdownComponents = {
        h1: ({ node, ...props }: any) => <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mt-8 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4" {...props} />,
        h2: ({ node, ...props }: any) => <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-6 mb-4" {...props} />,
        h3: ({ node, ...props }: any) => <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-5 mb-3" {...props} />,
        ul: ({ node, ...props }: any) => <ul className="list-disc list-outside ml-5 mb-4 space-y-2 text-slate-700 dark:text-slate-300" {...props} />,
        ol: ({ node, ...props }: any) => <ol className="list-decimal list-outside ml-5 mb-4 space-y-2 text-slate-700 dark:text-slate-300" {...props} />,
        li: ({ node, ...props }: any) => <li className="leading-relaxed pl-1" {...props} />,
        p: ({ node, ...props }: any) => <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed text-sm md:text-base" {...props} />,
        strong: ({ node, ...props }: any) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
        em: ({ node, ...props }: any) => <em className="italic text-slate-800 dark:text-slate-200" {...props} />,
        blockquote: ({ node, ...props }: any) => <blockquote className="border-l-4 border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-slate-800/50 p-4 my-6 rounded-r-lg text-slate-700 dark:text-slate-300 italic text-sm" {...props} />,
        a: ({ node, ...props }: any) => <a className="text-blue-600 dark:text-blue-400 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
        code: ({ node, ...props }: any) => <code className="bg-slate-100 dark:bg-slate-700 text-purple-600 dark:text-purple-400 px-1 py-0.5 rounded font-mono text-xs" {...props} />,
        hr: ({ node, ...props }: any) => <hr className="my-8 border-slate-200 dark:border-slate-700" {...props} />,
    };

    // STEP 0: Session Selection
    if (step === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            Partner Diskusi <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs px-2 py-1 rounded-full border border-purple-200 dark:border-purple-800">Mas Aldi (Alumni UT)</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Bantu jawab diskusi {courseName} agar orisinal & berbobot.</p>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* New Discussion Section */}
                    <div className="bg-gradient-to-br from-purple-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg border-2 border-purple-200 dark:border-purple-800 p-8 max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <div className="bg-purple-100 dark:bg-purple-900/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Mulai Diskusi Baru</h2>
                            <p className="text-slate-600 dark:text-slate-400">Pilih sesi diskusi yang ingin kamu kerjakan bersama Mas Aldi.</p>
                        </div>

                        <div className="max-w-md mx-auto">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Diskusi Sesi Berapa?</label>
                            <select
                                value={sessionNumber}
                                onChange={(e) => setSessionNumber(Number(e.target.value))}
                                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl p-4 mb-6 focus:ring-2 focus:ring-purple-500 outline-none text-lg"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                    <option key={n} value={n}>Sesi {n}</option>
                                ))}
                            </select>

                            <button
                                onClick={startNewDiscussion}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 text-lg"
                            >
                                <MessageSquare className="w-6 h-6" />
                                Mulai Diskusi
                            </button>
                        </div>
                    </div>

                    {/* Saved Discussions Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                                <BookOpen className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Riwayat Diskusi</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{savedDiscussions.length} diskusi tersimpan</p>
                            </div>
                        </div>

                        {savedDiscussions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {savedDiscussions.sort((a, b) => b.sessionNumber - a.sessionNumber).map(disc => (
                                    <div key={disc.id} className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all hover:shadow-lg flex flex-col h-full">
                                        <div className="p-5 flex-1">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                                                    Sesi {disc.sessionNumber}
                                                </span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                                    {new Date(disc.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-2" title={disc.question}>
                                                {disc.question}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">
                                                {disc.finalAnswer.substring(0, 150)}...
                                            </p>
                                        </div>

                                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-xl flex gap-3">
                                            <button
                                                onClick={() => loadDiscussion(disc)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 transition-all text-sm font-bold shadow-sm"
                                            >
                                                <ExternalLink className="w-4 h-4" /> Buka
                                            </button>
                                            <button
                                                onClick={() => deleteDiscussion(disc.id)}
                                                className="px-3 py-2 bg-white dark:bg-slate-700 text-red-500 dark:text-red-400 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-all shadow-sm"
                                                title="Hapus Diskusi"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-500 dark:text-slate-400 font-medium">Belum ada diskusi yang disimpan.</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Mulai diskusi baru di atas untuk menyimpan progress.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={resetAll} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Diskusi Sesi {sessionNumber} <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs px-2 py-1 rounded-full border border-purple-200 dark:border-purple-800">Mas Aldi</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{courseName}</p>
                </div>
                {step === 4 && finalAnswer && (
                    <button
                        onClick={saveDiscussion}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all shadow-md"
                    >
                        <Save className="w-4 h-4" />
                        Simpan
                    </button>
                )}
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center justify-between mb-10 px-2 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-800 -z-10 -translate-y-1/2 rounded-full"></div>

                {[
                    { id: 1, icon: MessageSquare, label: "Soal" },
                    { id: 2, icon: Search, label: "Riset Mas Aldi" },
                    { id: 3, icon: PenTool, label: "Poin Kamu" },
                    { id: 4, icon: FileCheck, label: "Racikan Final" }
                ].map((s) => {
                    const isActive = step >= s.id;
                    const isCurrent = step === s.id;
                    return (
                        <div key={s.id} className="flex flex-col items-center gap-2 bg-slate-50 dark:bg-slate-950 px-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${isActive
                                ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-purple-900/20'
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400'
                                } ${isCurrent ? 'scale-110 ring-4 ring-purple-100 dark:ring-purple-900/30' : ''}`}>
                                <s.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-xs font-bold ${isActive ? 'text-purple-700 dark:text-purple-400' : 'text-slate-400'}`}>{s.label}</span>
                        </div>
                    )
                })}
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* STEP 1: INPUT QUESTION */}
                <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-all ${step > 1 ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100' : ''}`}>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                        Halo {userName}! Copas soal Diskusi Sesi {sessionNumber} di sini ya.
                    </h3>
                    <textarea
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-purple-500 outline-none text-slate-800 dark:text-slate-200 disabled:opacity-70"
                        placeholder="Contoh: Jelaskan dampak inflasi terhadap daya beli masyarakat..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        disabled={step !== 1 || (isLoading && step === 1)}
                    ></textarea>

                    {step === 1 && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleResearch}
                                disabled={!question.trim() || isLoading}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Mas Aldi sedang riset...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-5 h-5" />
                                        Minta Mas Aldi Riset
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* STEP 2: AI RESEARCH RESULTS */}
                {(step >= 2) && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                Bahan Mentah dari Mas Aldi
                            </h3>
                            {(!isLoading || step > 2) && (
                                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-md font-medium border border-green-200 dark:border-green-800 flex items-center gap-1">
                                    <FileCheck className="w-3 h-3" /> Data Valid
                                </span>
                            )}
                        </div>

                        {isLoading && step === 2 ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400 animate-pulse mb-2">
                                    <Search className="w-5 h-5" />
                                    <span className="font-medium text-sm">Sedang melakukan Deep Search di internet...</span>
                                </div>
                                <Skeleton className="h-6 w-1/3 mb-4" />
                                <TextSkeleton lines={6} />
                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <Skeleton className="h-10 rounded-lg" />
                                    <Skeleton className="h-10 rounded-lg" />
                                </div>
                            </div>
                        ) : (
                            researchData && (
                                <>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700 mb-6 shadow-inner">
                                        <ReactMarkdown components={markdownComponents}>
                                            {researchData.text}
                                        </ReactMarkdown>
                                    </div>

                                    {researchData.sources.length > 0 && (
                                        <div className="mb-6">
                                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Referensi yang Mas Aldi temukan:</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {researchData.sources.map((src, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={src.uri}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-purple-400 hover:text-purple-600 transition-colors text-xs text-slate-600 dark:text-slate-400 truncate shadow-sm"
                                                    >
                                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                                        <span className="truncate">{src.title || src.uri}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => setStep(3)}
                                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all hover:opacity-90 shadow-md"
                                            >
                                                Oke, Lanjut Susun Poin <ArrowRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )
                        )}
                    </div>
                )}

                {/* STEP 3: USER POINTS */}
                {step >= 3 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in slide-in-from-bottom-4">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                Pendapatmu Sendiri (Penting Biar Gak Plagiat!)
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Berdasarkan riset Mas Aldi di atas, apa inti jawabanmu? Tulis poin-poinnya aja, nanti Mas Aldi yang rapikan bahasanya.
                            </p>
                        </div>

                        <textarea
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 min-h-[150px] focus:ring-2 focus:ring-purple-500 outline-none text-slate-800 dark:text-slate-200"
                            placeholder="- Poin 1: Saya setuju bahwa...\n- Poin 2: Menurut modul halaman 40...\n- Poin 3: Hal ini berkaitan dengan..."
                            value={userPoints}
                            onChange={(e) => setUserPoints(e.target.value)}
                            disabled={step !== 3 || (isLoading && step === 3)}
                        ></textarea>

                        {step === 3 && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleFinalize}
                                    disabled={!userPoints.trim() || isLoading}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Mas Aldi sedang meracik...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5 text-yellow-300" />
                                            Racik Jawaban Final
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 4: FINAL ANSWER */}
                {(step === 4) && (
                    <div className="bg-gradient-to-br from-white to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg border-2 border-purple-100 dark:border-slate-700 p-8 animate-in zoom-in-95 duration-500">
                        <div className="flex items-center gap-3 mb-6 border-b border-purple-100 dark:border-slate-700 pb-4">
                            <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-lg">
                                <FileCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Racikan Final Mas Aldi</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Siap diposting! Jangan lupa diparafrase dikit ya, {userName}.</p>
                            </div>
                        </div>

                        {isLoading && step === 4 ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400 animate-pulse mb-2">
                                    <PenTool className="w-5 h-5" />
                                    <span className="font-medium text-sm">Sedang menyusun paragraf dan referensi...</span>
                                </div>
                                <Skeleton className="h-8 w-1/2 mb-6" />
                                <TextSkeleton lines={4} />
                                <Skeleton className="h-6 w-1/3 mt-6 mb-4" />
                                <TextSkeleton lines={3} />
                                <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            </div>
                        ) : (
                            finalAnswer && (
                                <>
                                    <div className="mb-8 p-4 md:p-6 bg-white dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <ReactMarkdown components={markdownComponents}>
                                            {finalAnswer}
                                        </ReactMarkdown>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(finalAnswer);
                                                setAlert({
                                                    isOpen: true,
                                                    title: 'Berhasil Disalin!',
                                                    message: 'Jawaban sudah disalin ke clipboard. Tinggal paste di forum diskusi ya!',
                                                    type: 'success'
                                                });
                                            }}
                                            className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                                        >
                                            <FileCheck className="w-4 h-4" /> Salin Jawaban
                                        </button>
                                        <button
                                            onClick={saveDiscussion}
                                            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md"
                                        >
                                            <Save className="w-4 h-4" /> Simpan Diskusi
                                        </button>
                                        <button
                                            onClick={resetAll}
                                            className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-md"
                                        >
                                            <MessageSquare className="w-4 h-4" /> Diskusi Baru
                                        </button>
                                    </div>
                                </>
                            )
                        )}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Custom Modals */}
            <CustomAlert
                isOpen={alert.isOpen}
                onClose={() => setAlert({ ...alert, isOpen: false })}
                title={alert.title}
                message={alert.message}
                type={alert.type}
            />
            <CustomConfirm
                isOpen={confirm.isOpen}
                onClose={() => setConfirm({ ...confirm, isOpen: false })}
                onConfirm={confirm.onConfirm}
                title={confirm.title}
                message={confirm.message}
                type="danger"
            />
        </div>
    );
};

// Lucide icon helper
function Sparkles(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z" />
        </svg>
    )
}

export default DiscussionPartner;
