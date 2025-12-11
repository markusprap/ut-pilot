
import React, { useState } from 'react';
import { Download, Copy, AlertCircle, BookOpen, Zap, MessageCircle } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
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
  onSaveContent?: (content: string) => void; // New Prop
}

const NotesView: React.FC<NotesViewProps> = ({ content, chapter, isLoading, complexity, onComplexityChange, onSaveContent, onNavigateChapter, onBack }) => {
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

  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState("");

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionRect(null);
      return;
    }
    const text = selection.toString().trim();
    if (text.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionRect(rect);
      setSelectedText(text);
    } else {
      setSelectionRect(null);
    }
  };

  const applyHighlight = () => {
    // If no stored selection, try to get current selection
    let textToHighlight = selectedText;

    if (!textToHighlight) {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        textToHighlight = selection.toString().trim();
      }
    }

    if (!textToHighlight || !content || !onSaveContent) {
      setAlertState({
        isOpen: true,
        title: "Pilih Teks Dulu",
        message: "Silakan blok/seleksi teks yang ingin diberi stabilo, lalu klik tombol ini.",
        type: "info"
      });
      return;
    }

    // Naive replacement
    const newContent = content.replace(textToHighlight, `<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-1 text-slate-900 dark:text-white">${textToHighlight}</mark>`);

    onSaveContent(newContent);
    setSelectedText(""); // Reset
    setSelectionRect(null); // Hide floating toolbar

    // Clear selection
    if (window.getSelection()) {
      window.getSelection()?.removeAllRanges();
    }

    setAlertState({
      isOpen: true,
      title: "Stabilo Disimpan",
      message: "Highlight berhasil disimpan.",
      type: "success"
    });
  };

  // Remove highlight from selected text
  const removeHighlight = () => {
    let textToUnhighlight = selectedText;

    if (!textToUnhighlight) {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        textToUnhighlight = selection.toString().trim();
      }
    }

    if (!textToUnhighlight || !content || !onSaveContent) {
      setAlertState({
        isOpen: true,
        title: "Pilih Teks Dulu",
        message: "Silakan blok/seleksi teks yang di-stabilo untuk menghapus efeknya.",
        type: "info"
      });
      return;
    }

    // Remove mark tags around the selected text (handles the exact text match)
    const markPattern = `<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-1 text-slate-900 dark:text-white">${textToUnhighlight}</mark>`;
    const newContent = content.replace(markPattern, textToUnhighlight);

    if (newContent === content) {
      setAlertState({
        isOpen: true,
        title: "Tidak Ada Stabilo",
        message: "Teks yang dipilih tidak memiliki efek stabilo.",
        type: "info"
      });
      return;
    }

    onSaveContent(newContent);
    setSelectedText("");
    setSelectionRect(null);

    if (window.getSelection()) {
      window.getSelection()?.removeAllRanges();
    }

    setAlertState({
      isOpen: true,
      title: "Stabilo Dihapus",
      message: "Highlight berhasil dihapus.",
      type: "success"
    });
  };

  // Calculate floating toolbar position
  const getFloatingToolbarStyle = (): React.CSSProperties => {
    if (!selectionRect) return { display: 'none' };

    return {
      position: 'fixed',
      top: `${selectionRect.top - 45}px`, // 45px above selection
      left: `${selectionRect.left + (selectionRect.width / 2) - 50}px`, // Center horizontally
      zIndex: 9999,
    };
  };

  return (
    <div
      className="max-w-4xl mx-auto px-4 pb-8 animate-in fade-in duration-500 relative"
      onMouseUp={handleSelection} // Handle mouse selection
      onTouchEnd={handleSelection} // Handle touch selection (basic)
    >
      <CustomAlert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

      {/* Mode Selector & Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        {/* Complexity Selector */}
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
            onClick={applyHighlight}
            disabled={isLoading}
            className="flex items-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors shadow-sm disabled:opacity-50"
            title="Sorot teks yang dipilih"
          >
            <Zap className="w-3 h-3 mr-2" />
            Stabilo
          </button>
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
                <MarkdownRenderer content={content} className="text-slate-700 dark:text-slate-300" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Stabilo Toolbar - appears near text selection */}
      {selectionRect && selectedText && (
        <div
          style={getFloatingToolbarStyle()}
          className="animate-in fade-in zoom-in-95 duration-150 flex gap-1"
          onMouseDown={(e) => e.preventDefault()} // Prevent selection from being cleared
        >
          <button
            onClick={applyHighlight}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-2 rounded-l-lg shadow-lg font-medium text-sm transition-colors"
            title="Beri Stabilo"
          >
            <Zap className="w-4 h-4" />
            Stabilo
          </button>
          <button
            onClick={removeHighlight}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-r-lg shadow-lg font-medium text-sm transition-colors"
            title="Hapus Stabilo"
          >
            <AlertCircle className="w-4 h-4" />
            Hapus
          </button>
        </div>
      )}
    </div>
  );
};

export default NotesView;
