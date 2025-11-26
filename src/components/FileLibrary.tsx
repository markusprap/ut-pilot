import React, { useState } from 'react';
import { StoredFile } from '../types';
import { FileText, Trash2, Calendar, ChevronRight } from 'lucide-react';
import { CustomConfirm } from './CustomModal';

interface FileLibraryProps {
  files: StoredFile[];
  onSelectFile: (file: StoredFile) => void;
  onDeleteFile: (fileId: string) => void;
}

const FileLibrary: React.FC<FileLibraryProps> = ({ files, onSelectFile, onDeleteFile }) => {
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; fileId: string | null; fileName: string }>({
    isOpen: false,
    fileId: null,
    fileName: ''
  });

  if (files.length === 0) return null;

  const handleDeleteClick = (e: React.MouseEvent, file: StoredFile) => {
    e.stopPropagation();
    setConfirmState({
      isOpen: true,
      fileId: file.id,
      fileName: file.name
    });
  };

  const handleConfirmDelete = () => {
    if (confirmState.fileId) {
      onDeleteFile(confirmState.fileId);
    }
    setConfirmState({ isOpen: false, fileId: null, fileName: '' });
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <CustomConfirm
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, fileId: null, fileName: '' })}
        onConfirm={handleConfirmDelete}
        title="Hapus File?"
        message={`Apakah Anda yakin ingin menghapus file "${confirmState.fileName}" dari library?`}
        confirmText="Hapus"
        cancelText="Batal"
        type="danger"
      />

      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
        <FileText className="w-5 h-5 mr-2 text-blue-600" />
        Library Modul Saya
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer relative"
            onClick={() => onSelectFile(file)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 overflow-hidden">
                <div className="bg-blue-50 p-2.5 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 truncate pr-6">{file.name}</h3>
                  <div className="flex items-center text-xs text-slate-500 mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(file.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>

            <button
              onClick={(e) => handleDeleteClick(e, file)}
              className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
              title="Hapus dari Library"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileLibrary;