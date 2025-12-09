import React, { useState } from 'react';
import { Upload, X, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateCourseFormProps {
  onSubmit: (title: string, code: string, file: File, isPublic: boolean) => void;
  onCancel: () => void;
  isUploading: boolean;
}

const CreateCourseForm: React.FC<CreateCourseFormProps> = ({ onSubmit, onCancel, isUploading }) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file && title && code) {
      onSubmit(title, code, file, isPublic);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && !isUploading && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Buat Kelas Baru</DialogTitle>
          <DialogDescription>
            Isi detail kelas dan upload modul PDF Anda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Kode Mata Kuliah</Label>
            <Input
              id="code"
              placeholder="Contoh: MATA4101"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              disabled={isUploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Judul Modul</Label>
            <Input
              id="title"
              placeholder="Contoh: Pengantar Statistik Sosial"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isUploading}
            />
          </div>

          <div className="space-y-2">
            <Label>Upload Modul (PDF)</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer
                  ${dragActive ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}
                  ${file ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : ''}
                `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isUploading}
              />

              {file ? (
                <div className="text-center">
                  <FileText className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Ganti File
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Klik untuk upload atau drag & drop
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Hanya file PDF (Max 10MB)</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="public-check"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              disabled={isUploading}
            />
            <label htmlFor="public-check" className="text-sm text-slate-600 dark:text-slate-400 select-none cursor-pointer">
              Bagikan ke Komunitas (Orang lain bisa melihat & menyalin)
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onCancel} disabled={isUploading}>
              Batal
            </Button>
            <Button type="submit" disabled={!file || !title || !code || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                </>
              ) : (
                'Simpan Kelas'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCourseForm;