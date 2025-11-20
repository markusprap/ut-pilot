
import React from 'react';
import { Download, Copy, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface NotesViewProps {
  content: string;
  onBack: () => void;
  chapter: number;
  onNavigateChapter: (newChapter: number) => void;
  isLoading: boolean;
}

const NotesView: React.FC<NotesViewProps> = ({ content, chapter, isLoading }) => {
  
  const handleDownload = () => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UT-Pilot-Modul-${chapter}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (content) {
        navigator.clipboard.writeText(content);
        alert("Catatan berhasil disalin!");
    }
  }

  const validContent = typeof content === 'string' ? content : '';
  const isEmpty = !validContent || validContent.trim().length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-8 animate-in fade-in duration-500">
      
      {/* Toolbar */}
      <div className="flex justify-end gap-2 mb-4 mt-6">
            <button 
            onClick={handleCopy}
            disabled={isEmpty || isLoading}
            className="flex items-center bg-white text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
            <Copy className="w-3 h-3 mr-2" />
            Salin
            </button>
            <button 
            onClick={handleDownload}
            disabled={isEmpty || isLoading}
            className="flex items-center bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors shadow-sm disabled:opacity-50"
            >
            <Download className="w-3 h-3 mr-2" />
            Simpan
            </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-12 min-h-[400px] relative">
        {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 rounded-xl">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-600 font-medium animate-pulse">Sedang membaca Modul {chapter}...</p>
            </div>
        ) : null}

        {isEmpty && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-center font-medium">Tidak ada konten yang ditampilkan.</p>
          </div>
        ) : (
          <div className={`notes-content text-base md:text-lg transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-extrabold text-blue-700 mt-6 mb-6 border-b-2 border-blue-100 pb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-slate-700" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-slate-700" {...props} />,
                li: ({node, ...props}) => <li className="leading-relaxed pl-1" {...props} />,
                p: ({node, ...props}) => <p className="text-slate-700 mb-4 leading-relaxed whitespace-pre-wrap" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                em: ({node, ...props}) => <em className="italic text-slate-800 font-medium" {...props} />,
                code: ({node, ...props}) => <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded font-mono text-sm" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-300 bg-blue-50 p-4 my-4 rounded-r-lg text-slate-700 italic" {...props} />
              }}
            >
              {validContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesView;
