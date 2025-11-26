
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles, Lightbulb, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import { sendChatToTutor } from '../services/geminiService';

interface ChatWidgetProps {
  contextMaterial?: string; // Content of current chapter notes
  courseName: string;
  triggerMode?: 'floating' | 'static';
  userName?: string;
}

const SUGGESTIONS = [
  "Rangkum poin utama materi ini",
  "Berikan contoh studi kasus nyata",
  "Buatkan 3 soal latihan dari sini",
  "Jelaskan dengan bahasa yang lebih sederhana",
  "Apa yang sering keluar di ujian dari bab ini?"
];

const ChatWidget: React.FC<ChatWidgetProps> = ({ contextMaterial, courseName, triggerMode = 'floating', userName = "Mahasiswa" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
        id: 'intro',
        role: 'model',
        text: `Halo **${userName}**! Saya **UT-Pilot Tutor**. \n\nAda bagian dari materi *${courseName}* yang kurang jelas? Tanyakan saja di sini, saya siap bantu! 😊`,
        timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isLoading, isMaximized]);

  const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    
    const textToSend = overrideText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: textToSend,
        timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
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
            className={`fixed bottom-28 right-6 z-40 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600 animate-bounce-slight'}`}
        >
            {isOpen ? (
                <X className="w-6 h-6 text-white" />
            ) : (
                <>
                    <MessageSquare className="w-6 h-6 text-white" />
                    <span className="bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm hidden md:block">Tanya AI</span>
                </>
            )}
        </button>
      ) : (
        // Static Trigger Mode (Full width bar)
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full bg-white dark:bg-slate-800 border-2 border-dashed border-blue-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700/50 p-6 rounded-2xl flex items-center justify-between group transition-all"
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-6 h-6" />
                </div>
                <div className="text-left">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                        Ada Pertanyaan? Tanya AI Tutor
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Klik di sini untuk berdiskusi tentang materi ini.
                    </p>
                </div>
            </div>
            <div className={`p-2 rounded-full ${isOpen ? 'bg-red-100 text-red-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-blue-500'}`}>
                 {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed z-[60] bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-300 ease-in-out
            ${isMaximized 
                ? 'inset-0 w-full h-full rounded-none' 
                : 'bottom-6 right-6 w-[90vw] md:w-[400px] h-[550px] max-h-[70vh] rounded-2xl animate-in slide-in-from-bottom-10 fade-in'
            }
        `}>
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <Sparkles className="w-5 h-5 text-yellow-300" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg leading-none">Tutor AI</h3>
                        <p className="text-blue-100 text-xs mt-1">Siap menjawab pertanyaan materi</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                        title={isMaximized ? "Kecilkan Tampilan" : "Layar Penuh"}
                    >
                        {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                        title="Tutup Chat"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50 scroll-smooth">
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                            {msg.role === 'user' ? <User className="w-5 h-5 text-slate-600 dark:text-slate-300" /> : <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                        </div>
                        
                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-tr-none border border-slate-100 dark:border-slate-700' 
                                : 'bg-blue-600 text-white rounded-tl-none'
                        }`}>
                            {msg.role === 'user' ? (
                                msg.text
                            ) : (
                                <div className="prose prose-sm prose-invert max-w-none break-words">
                                    <ReactMarkdown components={{
                                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                                        strong: ({node, ...props}) => <strong className="font-bold text-yellow-200" {...props} />,
                                        a: ({node, ...props}) => <a className="text-blue-200 underline" {...props} />,
                                        code: ({node, ...props}) => <code className="bg-black/20 px-1 rounded" {...props} />,
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
                         <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="bg-blue-600 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                            <span className="text-white text-xs font-medium">Sedang berpikir...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions & Input Area */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 pb-safe">
                {/* Suggestions Chips */}
                {!isLoading && (
                    <div className="px-4 pt-3 pb-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Saran Pertanyaan:</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
                            {SUGGESTIONS.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => handleSend(e, suggestion)}
                                    className="whitespace-nowrap flex-shrink-0 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/30 dark:hover:border-blue-800 text-slate-600 dark:text-slate-300 text-xs rounded-full transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Form */}
                <form onSubmit={(e) => handleSend(e)} className="p-3 flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ketik pertanyaanmu..."
                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white p-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center aspect-square"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;