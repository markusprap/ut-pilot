
export enum AppMode {
  LANDING = 'LANDING',     // Halaman Depan / Promosi
  HOME = 'HOME',
  COURSE_DASHBOARD = 'COURSE_DASHBOARD', // Menu pilihan setelah pilih kelas
  STUDY_SESSION = 'STUDY_SESSION',       // Mode Belajar (Notes + Quiz)
  EXAM_SIMULATION = 'EXAM_SIMULATION',   // Mode UAS
  EXAM_REVIEW = 'EXAM_REVIEW',           // Review Riwayat UAS
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface ModuleData {
  notes?: string;
  quiz?: QuizQuestion[];
}

export interface ExamHistoryItem {
  id: string;
  date: number;
  score: number;
  totalQuestions: number;
  analysisSummary: string;
  questions: QuizQuestion[];
  userAnswers: number[];
}

export interface Course {
  id: string;
  title: string;      // Nama Mata Kuliah
  code: string;       // Kode Mata Kuliah (misal: MKWI4201)
  fileUri: string;
  mimeType: string;
  fileName: string;
  createdAt: number;
  lastAccessed: number;
  modules: Record<number, ModuleData>; // Key adalah nomor bab/modul
  examHistory: ExamHistoryItem[]; // Riwayat nilai ujian
}

export interface StoredFile {
  id: string;
  name: string;
  createdAt: number;
}

export interface GeneratedContent {
  type: 'markdown' | 'json';
  content: string | QuizQuestion[];
}

export interface FileData {
  name: string;
  base64: string;
  mimeType: string;
}