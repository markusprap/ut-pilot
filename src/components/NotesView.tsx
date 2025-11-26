
import React, { useState } from 'react';
import { Download, Copy, AlertCircle, BookOpen, Zap, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { NoteComplexity } from '../services/geminiService';
import { NotesSkeleton } from './Skeleton';
import { CustomAlert } from './CustomModal';

interface NotesViewProps {
  content: string;
  onBack: () => void;
  chapter: number;
  onNavigateChapter: (newChapter: number) => void;
  isLoading: boolean;
  complexity: NoteComplexity;
  onComplexityChange: (mode: NoteComplexity) => void;
}

const NotesView: React.FC<NotesViewProps> = ({ content, chapter, isLoading, complexity, onComplexityChange }) => {
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'info' | 'success' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const handleDownload = () => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UT-Pilot-Modul-${chapter}-${complexity}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setAlertState({
        isOpen: true,
        title: 'Berhasil Disalin',
        message: 'Catatan berhasil disalin ke clipboard!',
        type: 'success'
      });
    }
  }

  const validContent = typeof content === 'string' ? content : '';
  const isEmpty = !validContent || validContent.trim().length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-8 animate-in fade-in duration-500">
      <CustomAlert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

      {/* Mode Selector & Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 mt-6">

        {/* Complexity Toggle */}
        <div className="bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex w-full md:w-auto">
          <button
            onClick={() => onComplexityChange('NORMAL')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${complexity === 'NORMAL' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <BookOpen className="w-4 h-4" />
            Normal
          </button>
          <button
            onClick={() => onComplexityChange('EASY')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${complexity === 'EASY' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <Zap className="w-4 h-4" />
            Mudah
          </button>
          <button
            onClick={() => onComplexityChange('VERY_EASY')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${complexity === 'VERY_EASY' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <MessageCircle className="w-4 h-4" />
            Analogi
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 w-full md:w-auto">
          <button
            onClick={handleCopy}
            disabled={isEmpty || isLoading}
            className="flex items-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Copy className="w-3 h-3 mr-2" />
            Salin
          </button>
          <button
            onClick={handleDownload}
            disabled={isEmpty || isLoading}
            className="flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3 h-3 mr-2" />
            Simpan
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-850 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-12 min-h-[400px] relative transition-colors duration-300">

        {isLoading ? (
          <NotesSkeleton />
        ) : (
          <>
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
                <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-center font-medium">Tidak ada konten yang ditampilkan.</p>
              </div>
            ) : (
              <div className="notes-content text-base md:text-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 mt-6 mb-6 border-b-2 border-blue-100 dark:border-slate-700 pb-2" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 mb-3" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-slate-700 dark:text-slate-300" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-slate-700 dark:text-slate-300" {...props} />,
                    li: ({ node, ...props }) => <li className="leading-relaxed pl-1" {...props} />,
                    p: ({ node, ...props }) => <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed whitespace-pre-wrap" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
                    em: ({ node, ...props }) => <em className="italic text-slate-800 dark:text-slate-200 font-medium" {...props} />,
                    code: ({ node, ...props }) => <code className="bg-slate-100 dark:bg-slate-700 text-pink-600 dark:text-pink-400 px-1 py-0.5 rounded font-mono text-sm" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-slate-800/50 p-4 my-4 rounded-r-lg text-slate-700 dark:text-slate-300 italic" {...props} />,
                    hr: ({ node, ...props }) => <hr className="my-8 border-slate-200 dark:border-slate-700" {...props} />,
                  }}
                >
                  {validContent}
                </ReactMarkdown>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotesView;
