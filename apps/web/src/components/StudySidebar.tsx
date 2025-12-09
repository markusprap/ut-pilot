import React from 'react';
import { BookOpen, CheckCircle, Circle, ChevronRight, Lock } from 'lucide-react';
import { ModuleData } from '../types';

interface StudySidebarProps {
    currentChapter: number;
    modules: Record<number, ModuleData>;
    toc?: { chapter: number; title: string }[]; // NEW: Dynamic TOC
    onSelectChapter: (chapter: number) => void;
    isOpen: boolean;
    onClose: () => void;
}

const StudySidebar: React.FC<StudySidebarProps> = ({
    currentChapter,
    modules,
    toc,
    onSelectChapter,
    isOpen,
    onClose
}) => {
    // Dynamic Chapters: Use TOC if available, otherwise fallback to 1-12
    const chapters = toc && toc.length > 0
        ? toc.map(t => t.chapter)
        : Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <div
                className={`fixed top-[64px] left-0 h-[calc(100vh-64px)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-72 transform transition-transform duration-300 ease-in-out z-40 overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:hidden'
                    } ${isOpen ? 'shadow-xl' : ''}`}
            >
                <div className="p-4 pt-20">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                        Daftar Modul
                    </h3>

                    <div className="space-y-2">
                        {chapters.map((chapterNum) => {
                            const styles = modules[chapterNum];
                            // Check if any note content exists to consider it "Generated"
                            const isGenerated = !!(styles?.notes || styles?.notesEasy || styles?.notesVeryEasy);
                            const isCurrent = currentChapter === chapterNum;

                            // Get Title if available
                            const tocItem = toc?.find(t => t.chapter === chapterNum);
                            const displayTitle = tocItem ? tocItem.title : `Materi Modul ${chapterNum}`;

                            return (
                                <button
                                    key={chapterNum}
                                    onClick={() => {
                                        onSelectChapter(chapterNum);
                                        // On mobile, close after selection
                                        if (window.innerWidth < 1024) onClose();
                                    }}
                                    className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between transition-all group ${isCurrent
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 w-full overflow-hidden">
                                        <div className={`p-1.5 rounded-full shrink-0 ${isCurrent
                                            ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-400'
                                            : isGenerated
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                            }`}>
                                            {isGenerated ? (
                                                <CheckCircle className="w-4 h-4" />
                                            ) : (
                                                <Circle className="w-4 h-4" />
                                            )}
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            {/* Line 1: MODUL Label */}
                                            <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                                                }`}>
                                                MODUL {chapterNum}
                                            </span>

                                            {/* Line 2: The Title */}
                                            <span className={`text-sm font-medium line-clamp-2 ${isCurrent
                                                ? 'text-blue-700 dark:text-blue-300'
                                                : isGenerated
                                                    ? 'text-slate-900 dark:text-slate-200'
                                                    : 'text-slate-400 dark:text-slate-600'
                                                }`} title={displayTitle}>
                                                {displayTitle}
                                            </span>

                                            {/* Line 3: Status */}
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                                {isGenerated ? 'Tersedia' : 'Belum dibuat'}
                                            </span>
                                        </div>
                                    </div>

                                    {isCurrent && (
                                        <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
};

export default StudySidebar;
