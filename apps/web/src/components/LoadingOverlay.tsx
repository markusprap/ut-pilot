import React, { useState, useEffect } from 'react';
import { Loader2, BrainCircuit, Sparkles, BookOpen } from 'lucide-react';

const LOADING_MESSAGES = [
    "Sedang membaca modul Anda...",
    "Menganalisis topik-topik penting...",
    "Menyiapkan 45 soal yang menantang...",
    "Memvalidasi kunci jawaban...",
    "Sedikit lagi! AI sedang merapikan format...",
    "Mencari celah materi yang sering keluar di UAS...",
    "Jangan lupa berdoa sebelum ujian ya! 🙏",
    "Persiapkan diri, hasil tidak akan mengkhianati usaha. 💪"
];

interface LoadingOverlayProps {
    isVisible: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 3000); // Change message every 3 seconds

        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="relative mb-8">
                {/* Center Pulsing Icon */}
                <div className="relative z-10 w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 animate-pulse">
                    <BrainCircuit className="w-12 h-12" />
                </div>

                {/* Orbiting Icons */}
                <div className="absolute inset-0 animate-spin-slow">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
                        <Sparkles className="w-6 h-6 text-purple-500 animate-bounce" />
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4">
                        <BookOpen className="w-6 h-6 text-yellow-500 animate-bounce delay-150" />
                    </div>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">
                Menyiapkan Ujian
            </h3>

            {/* Rotating Message */}
            <div className="h-8 flex items-center justify-center w-full max-w-md">
                <p
                    key={messageIndex} // Key forces re-render for animation
                    className="text-slate-500 dark:text-slate-400 text-center animate-in slide-in-from-bottom-2 fade-in duration-500"
                >
                    {LOADING_MESSAGES[messageIndex]}
                </p>
            </div>

            <div className="mt-8 flex gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
            </div>
        </div>
    );
};

export default LoadingOverlay;
