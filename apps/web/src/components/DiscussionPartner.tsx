import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Plus, Send, User, MessageCircle, Search, ThumbsUp } from 'lucide-react';
import { forumService } from '../services/forumService';
import { ForumThread, ForumPost } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { Skeleton } from './Skeleton';
import { useApp } from '../context/AppContext';

interface DiscussionPartnerProps {
    courseName: string;
    courseCode?: string; // We need this for the forum ID
    userName: string;
    onBack: () => void;
}

// Extract Course Code helper
const extractCourseCode = (title: string): string => {
    // Try to find pattern like MKDU4110
    const match = title.match(/[A-Z]{4}\d{4}/);
    return match ? match[0] : title.replace(/\s+/g, '').substring(0, 10).toUpperCase();
};

const DiscussionPartner: React.FC<DiscussionPartnerProps> = ({ courseName, courseCode: propCourseCode, userName, onBack }) => {
    const { user } = useApp();

    // Use prop if available, otherwise fallback to extraction
    const courseCode = propCourseCode || extractCourseCode(courseName);

    const [view, setView] = useState<'LIST' | 'DETAIL' | 'CREATE'>('LIST');
    const [threads, setThreads] = useState<ForumThread[]>([]);
    const [activeThread, setActiveThread] = useState<ForumThread | null>(null);
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Create form state
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reply form state
    const [replyContent, setReplyContent] = useState('');

    // Load Threads on Mount
    useEffect(() => {
        loadThreads();
    }, [courseCode]);

    const loadThreads = async () => {
        setIsLoading(true);
        const data = await forumService.getThreads(courseCode);
        setThreads(data);
        setIsLoading(false);
    };

    const handleOpenThread = async (thread: ForumThread) => {
        setActiveThread(thread);
        setView('DETAIL');
        setIsLoading(true);
        const { posts } = await forumService.getThreadDetails(thread.id);
        setPosts(posts);
        setIsLoading(false);
    };

    const handleCreateThread = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim() || !user) return;

        setIsSubmitting(true);
        const thread = await forumService.createThread(courseCode, user.id, userName, newTitle, newContent);
        if (thread) {
            setThreads([thread, ...threads]); // Optimistic update
            setView('LIST');
            setNewTitle('');
            setNewContent('');
        }
        setIsSubmitting(false);
    };

    const handleReply = async () => {
        if (!replyContent.trim() || !activeThread || !user) return;

        setIsSubmitting(true);
        const post = await forumService.replyToThread(activeThread.id, user.id, userName, replyContent);
        if (post) {
            setPosts([...posts, post]);
            setReplyContent('');
        }
        setIsSubmitting(false);
    };

    // --- VIEWS ---
    const renderHeader = () => (
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 sticky top-0 z-10 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
                <button onClick={() => view === 'LIST' ? onBack() : setView('LIST')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div>
                    <h2 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">Forum Kelas {courseName}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Diskusi & Tanya Jawab Komunitas ({courseCode})</p>
                </div>
            </div>
            {view === 'LIST' && (
                <button
                    onClick={() => setView('CREATE')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Buat Topik</span>
                </button>
            )}
        </div>
    );

    if (view === 'CREATE') {
        return (
            <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
                {renderHeader()}
                <div className="max-w-3xl mx-auto w-full p-4 flex-1">
                    <form onSubmit={handleCreateThread} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Buat Topik Diskusi Baru</h3>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Judul Pertanyaan / Topik</label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Contoh: Bingung dengan konsep Modul 3..."
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Isi Diskusi</label>
                            <textarea
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                placeholder="Jelaskan pertanyaanmu dengan detail..."
                                className="w-full p-3 h-40 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-2">*Mendukung format Markdown sederhana.</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button type="button" onClick={() => setView('LIST')} className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors">Batal</button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
                            >
                                {isSubmitting ? 'Memposting...' : 'Posting Diskusi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    if (view === 'DETAIL' && activeThread) {
        return (
            <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
                {renderHeader()}
                <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                    <div className="max-w-4xl mx-auto space-y-6 pb-20">
                        {/* Main Thread */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                                        {activeThread.user_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">{activeThread.title}</h1>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            <User className="w-3 h-3" /> {activeThread.user_name}
                                            <span>•</span>
                                            {new Date(activeThread.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="prose prose-blue dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                                <MarkdownRenderer content={activeThread.content} />
                            </div>
                        </div>

                        {/* Replies */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                {posts.length} Balasan
                            </h3>

                            {isLoading ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="text-center py-10 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <p className="text-slate-500 dark:text-slate-400">Belum ada balasan. Jadilah yang pertama menjawab!</p>
                                </div>
                            ) : (
                                posts.map((post) => (
                                    <div key={post.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-4 animate-in fade-in">
                                        <div className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold text-xs mt-1">
                                            {post.user_name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-sm text-slate-900 dark:text-white">{post.user_name}</span>
                                                <span className="text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                <MarkdownRenderer content={post.content} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Reply Input */}
                <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 sticky bottom-0 z-10 transition-all">
                    <div className="max-w-4xl mx-auto flex gap-3">
                        <div className="flex-1 relative">
                            <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Tulis balasanmu di sini..."
                                className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-2xl py-3 px-4 pr-12 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-12 min-h-[48px] max-h-32 transition-all"
                                style={{ height: (replyContent.split('\n').length > 1) ? 'auto' : '48px' }}
                            />
                        </div>
                        <button
                            onClick={handleReply}
                            disabled={!replyContent.trim() || isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
            {renderHeader()}

            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto space-y-4">
                    {/* Search / Filter (Visual Placeholder for now) */}
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari topik diskusi..."
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                        />
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-32 animate-pulse" />)}
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="w-10 h-10 text-blue-500 dark:text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Belum Ada Diskusi</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2 mb-6">Jadilah yang pertama membuka diskusi untuk mata kuliah ini. Teman-temanmu mungkin punya pertanyaan yang sama!</p>
                            <button
                                onClick={() => setView('CREATE')}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-sm"
                            >
                                Mulai Diskusi Baru
                            </button>
                        </div>
                    ) : (
                        threads.map((thread) => (
                            <div
                                key={thread.id}
                                onClick={() => handleOpenThread(thread)}
                                className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">{thread.title}</h3>
                                    <span className="text-xs text-slate-400 whitespace-nowrap ml-4">{new Date(thread.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-4">{thread.content}</p>

                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                                            {thread.user_name.charAt(0)}
                                        </div>
                                        <span>{thread.user_name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <MessageCircle className="w-4 h-4" />
                                            {thread.reply_count || 0} Balasan
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiscussionPartner;
