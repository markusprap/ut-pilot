import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { CustomAlert } from './CustomModal';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  isUploading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, onClearFile, isUploading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'info' | 'success' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      setAlertState({
        isOpen: true,
        title: 'Format File Salah',
        message: 'Mohon upload file PDF saja.',
        type: 'error'
      });
      return;
    }
    // Limit 50MB due to API restrictions on document processing
    if (file.size > 50 * 1024 * 1024) {
      setAlertState({
        isOpen: true,
        title: 'File Terlalu Besar',
        message: 'Ukuran file terlalu besar. Maksimal 50MB agar dapat diproses oleh AI. Silakan kompres file PDF Anda.',
        type: 'error'
      });
      return;
    }
    onFileSelect(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-8">
      <CustomAlert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

      {!selectedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-xl p-10 transition-all duration-200 ease-in-out flex flex-col items-center justify-center text-center cursor-pointer group
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
        >
          <input
            type="file"
            ref={inputRef}
            onChange={handleInputChange}
            accept="application/pdf"
            className="hidden"
            disabled={isUploading}
          />

          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-semibold text-slate-800 mb-1">
            Upload Modul Digital (PDF)
          </h3>
          <p className="text-sm text-slate-500 mb-4 max-w-xs">
            Tarik file ke sini atau klik untuk mencari.
            <br /><span className="text-xs text-slate-400">(Maksimal 50MB. Gunakan ilovepdf.com untuk kompres jika perlu)</span>
          </p>
        </div>
      ) : (
        <div className={`bg-white border rounded-xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-2 ${isUploading ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            <div className={`p-2 rounded-lg ${isUploading ? 'bg-blue-100' : 'bg-green-100'}`}>
              {isUploading ? (
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              ) : (
                <FileText className="w-6 h-6 text-green-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {selectedFile.name}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {isUploading ? (
                  <span className="text-xs font-medium text-blue-600 animate-pulse">
                    • Sedang membaca file (mohon tunggu)...
                  </span>
                ) : (
                  <span className="text-xs font-medium text-green-600 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Siap diproses
                  </span>
                )}
              </div>
            </div>
          </div>
          {!isUploading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearFile();
              }}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              title="Ganti File"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;