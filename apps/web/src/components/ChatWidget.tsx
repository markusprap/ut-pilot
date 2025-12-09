
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles, Lightbulb, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessage } from '../types';
import { sendChatToTutor } from '../services/geminiService';
import { createChatSession, fetchChatSessions, fetchSessionMessages, saveMessage, getDailyMessageCount, ChatSession } from '../services/chatService';
import { Button } from "@/components/ui/button";

interface ChatWidgetProps {
    contextMaterial?: string;
    courseName: string;
    courseId: string;
    triggerMode?: 'floating' | 'static';
    userName?: string;
    userId?: string; // NEW: Required for DB Limit Check
    isPremium?: boolean;
}

const SUGGESTIONS = [
    "Rangkum poin utama materi ini",
    "Berikan contoh studi kasus nyata",
    "Buatkan 3 soal latihan dari sini",
    "Jelaskan dengan bahasa yang lebih sederhana",
    "Apa yang sering keluar di ujian dari bab ini?"
];

const ChatWidget: React.FC<ChatWidgetProps> = ({ contextMaterial, courseName, courseId, triggerMode = 'floating', userName = "Mahasiswa", userId, isPremium = false }) => {
    // ... State ...
    const [isOpen, setIsOpen] = useState(false);
    const [isSidebarMode, setIsSidebarMode] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    // --- DAILY LIMIT LOGIC (DB BASED) ---
    // We check async inside handleSend
    // -------------------------

    // Load or Create Session... (No changes)
    useEffect(() => {
        if (isOpen && !activeSessionId && !isHistoryLoaded) {
            const initSession = async () => {
                // ... (Existing Init Logic) ...
                const sessions = await fetchChatSessions(courseId);

                if (sessions.length > 0) {
                    const latestSession = sessions[0];
                    setActiveSessionId(latestSession.id);
                    const history = await fetchSessionMessages(latestSession.id);
                    setMessages(history);
                } else {
                    setMessages([
                        {
                            id: 'intro',
                            role: 'model',
                            text: `Halo **${userName}**! Saya **UT-Pilot Tutor**. \n\nAda bagian dari materi *${courseName}* yang kurang jelas? Tanyakan saja di sini, saya siap bantu! 😊`,
                            timestamp: Date.now()
                        }
                    ]);
                }
                setIsHistoryLoaded(true);
            };
            initSession();
        }
    }, [isOpen, courseId, activeSessionId, isHistoryLoaded, userName, courseName]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, isLoading, isSidebarMode]);

    const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
        e?.preventDefault();

        const textToSend = overrideText || inputValue;
        if (!textToSend.trim() || isLoading) return;

        // 1. CHECK DB LIMIT (Async)
        if (!isPremium && userId) {
            // Show Loading indicator for limit check? Or just block UI?
            // Since it's async, we pause slightly.

            const currentCount = await getDailyMessageCount(userId);
            if (currentCount >= 10) {
                const limitMsg: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'model',
                    text: "🚫 **Limit Chat Harian Habis**\n\nMaaf, kamu sudah mencapai batas 10 percakapan gratis hari ini (Reset setiap jam 00:00). Karena biaya AI lumayan mahal, kami harus membatasinya untuk pengguna Basic.\n\n**Silakan kembali lagi besok** atau Upgrade ke Premium untuk akses tanpa batas! 🚀",
                    timestamp: Date.now()
                };

                // Show user message first? No, if blocked, don't show user message as 'sent'.
                // Show ONLY the bot rejection.
                // Actually UX is better if we show "User sent" -> "Bot rejects".
                // But if we don't save to DB, it disappears on reload. That's fine.
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'user',
                    text: textToSend,
                    timestamp: Date.now()
                }, limitMsg]);

                setInputValue("");
                return;
            }
        }

        // LIMIT OK -> PROCEED

        // Optimistic Update
        const tempId = Date.now().toString();
        const userMsg: ChatMessage = {
            id: tempId,
            role: 'user',
            text: textToSend,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);

        try {
            // 1. Ensure Session Exists
            let sessionId = activeSessionId;
            if (!sessionId) {
                const newSession = await createChatSession(courseId);
                if (newSession) {
                    sessionId = newSession.id;
                    setActiveSessionId(sessionId);
                }
            }

            // 2. Save User Message to DB (Fire and forget or await?)
            if (sessionId) {
                // Background save, don't block
                saveMessage(sessionId, 'user', textToSend);
            }

            // 3. Call AI
            // Prepare history for API (exclude intro)
            const historyForApi = messages.filter(m => m.id !== 'intro');
            const responseText = await sendChatToTutor(historyForApi, userMsg.text, userName, contextMaterial);

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, botMsg]);

            // 4. Save Bot Message to DB
            if (sessionId) {
                saveMessage(sessionId, 'model', responseText);
            }

        } catch (error) {
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "Maaf, koneksi terputus atau terjadi kesalahan. Mohon coba lagi.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Trigger Button */}
            {triggerMode === 'floating' ? (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2 ${isOpen ? 'bg-destructive rotate-90' : 'bg-primary animate-bounce-slight'}`}
                >
                    {isOpen ? (
                        <X className="w-6 h-6 text-white" />
                    ) : (
                        <>
                            <MessageSquare className="w-6 h-6 text-white" />
                            <span className="bg-white text-primary text-xs font-bold px-2 py-0.5 rounded-full shadow-sm hidden md:block">Tanya AI</span>
                        </>
                    )}
                </button>
            ) : (
                // Static Trigger Mode (Full width bar)
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-card border-2 border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 p-6 rounded-2xl flex items-center justify-between group transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                Ada Pertanyaan? Tanya AI Tutor
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Klik di sini untuk berdiskusi tentang materi ini.
                            </p>
                        </div>
                    </div>
                    <div className={`p-2 rounded-full ${isOpen ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground group-hover:text-primary'}`}>
                        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                    </div>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className={`fixed z-[60] bg-background shadow-2xl border border-border flex flex-col overflow-hidden transition-all duration-300 ease-in-out
            ${isSidebarMode
                        ? 'top-0 right-0 w-[400px] h-full rounded-l-2xl border-l'
                        : 'bottom-20 right-6 w-[90vw] md:w-[400px] h-[550px] max-h-[70vh] rounded-2xl animate-in slide-in-from-bottom-10 fade-in'
                    }
        `}>

                    {/* Header */}
                    <div className="bg-primary p-4 flex items-center justify-between shadow-md shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <Sparkles className="w-5 h-5 text-yellow-300" />
                            </div>
                            <div>
                                <h3 className="text-primary-foreground font-bold text-lg leading-none">Tutor AI</h3>
                                <p className="text-primary-foreground/80 text-xs mt-1">
                                    {isHistoryLoaded ? 'Siap menjawab pertanyaan materi' : 'Memuat riwayat...'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsSidebarMode(!isSidebarMode)}
                                className="p-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/20 rounded-lg transition-colors hidden md:block" // Hide on mobile since full sidebar might be too much or controlled differently
                                title={isSidebarMode ? "Kecilkan Tampilan" : "Mode Sidebar (Layar Penuh Samping)"}
                            >
                                {isSidebarMode ? <Minimize2 className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/20 rounded-lg transition-colors"
                                title="Tutup Chat"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 w-full min-h-0 overflow-y-auto p-4 space-y-4 bg-muted/30 scroll-smooth">
                        {!isHistoryLoaded && (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-secondary' : 'bg-primary/10'}`}>
                                    {msg.role === 'user' ? <User className="w-5 h-5 text-foreground" /> : <Bot className="w-5 h-5 text-primary" />}
                                </div>

                                <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-card text-card-foreground rounded-tr-none border border-border'
                                    : 'bg-primary text-white rounded-tl-none'
                                    }`}>
                                    {msg.role === 'user' ? (
                                        msg.text
                                    ) : (
                                        <div className={`prose prose-sm max-w-none break-words ${msg.role === 'model' ? 'prose-invert text-white' : ''}`}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0 text-white" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 text-white" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 text-white" {...props} />,
                                                    li: ({ node, ...props }) => <li className="text-white" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-bold text-yellow-200" {...props} />,
                                                    a: ({ node, ...props }) => <a className="text-blue-200 underline" {...props} />,
                                                    code: ({ node, ...props }) => <code className="bg-black/20 px-1 rounded font-mono text-white" {...props} />,
                                                }}>
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Bot className="w-5 h-5 text-primary" />
                                </div>
                                <div className="bg-primary rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                                    <span className="text-primary-foreground text-xs font-medium">Sedang berpikir...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions & Input Area */}
                    <div className="bg-background border-t border-border shrink-0 pb-2">
                        {/* Suggestions Chips */}
                        <div className={`px-4 pt-3 pb-1 transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-3 h-3 text-yellow-500" />
                                <span className="text-xs font-medium text-muted-foreground">Saran Pertanyaan:</span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
                                {SUGGESTIONS.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => handleSend(e, suggestion)}
                                        disabled={isLoading}
                                        className="whitespace-nowrap flex-shrink-0 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-transparent hover:border-border text-secondary-foreground text-xs rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input Form */}
                        <form onSubmit={(e) => handleSend(e)} className="p-3 flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ketik pertanyaanmu..."
                                className="flex-1 bg-muted/50 text-foreground rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
                            />
                            <Button
                                type="submit"
                                disabled={!inputValue.trim() || isLoading}
                                size="icon"
                                className="rounded-xl h-10 w-10 shrink-0"
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatWidget;