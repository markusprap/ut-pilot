import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, BookPlus, FileText, CheckCircle2 } from 'lucide-react';
import { CustomAlert } from './CustomModal';

interface CreateCourseFormProps {
  onSubmit: (title: string, code: string, file: File) => void;
  onCancel: () => void;
  isUploading: boolean;
}

const CreateCourseForm: React.FC<CreateCourseFormProps> = ({ onSubmit, onCancel, isUploading }) => {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'info' | 'success' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf') {
        setAlertState({
          isOpen: true,
          title: 'Format File Salah',
          message: 'Mohon upload file PDF saja.',
          type: 'error'
        });
        return;
      }
      if (selected.size > 50 * 1024 * 1024) {
        setAlertState({
          isOpen: true,
          title: 'File Terlalu Besar',
          message: 'Ukuran file terlalu besar. Maksimal 50MB.',
          type: 'error'
        });
        return;
      }
      setFile(selected);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && code && file) {
      onSubmit(title, code, file);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <CustomAlert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in duration-200 overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="bg-blue-600 dark:bg-blue-700 px-6 py-4 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <BookPlus className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Buat Kelas Baru</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Mata Kuliah</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Bahasa Inggris Niaga"
              className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kode Mata Kuliah</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: ADBI4201"
              className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase placeholder:text-slate-400"
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upload Modul (PDF)</label>
            {!file ? (
              <div
                onClick={() => !isUploading && inputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
              >
                <input
                  type="file"
                  ref={inputRef}
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Klik untuk upload PDF</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Maksimal 50MB</p>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB • Siap upload</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-2"
                  disabled={isUploading}
                >
                  Ganti
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isUploading}
              className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!title || !code || !file || isUploading}
              className="flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Buat Kelas
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCourseForm;