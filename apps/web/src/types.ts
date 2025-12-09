
export enum AppMode {
  LANDING = 'LANDING',     // Halaman Depan / Promosi
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  COURSE_DASHBOARD = 'COURSE_DASHBOARD', // Menu pilihan setelah pilih kelas
  STUDY_SESSION = 'STUDY_SESSION',       // Mode Belajar (Notes + Quiz)
  EXAM_SIMULATION = 'EXAM_SIMULATION',   // Mode UAS
  DISCUSSION_PARTNER = 'DISCUSSION_PARTNER', // Fitur Baru: Partner Diskusi Tuton
}

export interface UserProfile {
  name: string;
  joinedAt: number;
  avatarUrl?: string;
  id?: string;
  email?: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  image_prompt?: string;
  image_url?: string;
  db_id?: string;
}

export interface ModuleData {
  notes?: string;          // Mode Normal
  notesEasy?: string;      // Mode Gampang Dipahami
  notesVeryEasy?: string;  // Mode Sangat Gampang (Analogi)
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
  storageUrl?: string; // NEW: Supabase Storage public URL for PDF viewing
  mimeType: string;
  fileName: string;
  createdAt: number;
  lastAccessed: number;
  modules: Record<number, ModuleData>; // Key adalah nomor bab/modul
  examHistory: ExamHistoryItem[]; // Riwayat nilai ujian
  userPersonalNotes?: string; // Catatan pribadi user untuk file ini
  // Community Features
  isPublic?: boolean;
  originalAuthorId?: string;
  authorName?: string;
  userId?: string; // ID of the User who owns this course row (for access control)

  // Smart TOC
  toc?: { chapter: number; title: string }[];
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ResearchResult {
  text: string;
  sources: { title: string; uri: string }[];
}

export interface SavedDiscussion {
  id: string;
  sessionNumber: number;
  courseName: string;
  question: string;
  researchData: ResearchResult | null;
  userPoints: string;
  finalAnswer: string;
  createdAt: string;
}

export interface ForumThread {
  id: string;
  course_code: string;
  user_id: string;
  user_name: string;
  title: string;
  content: string;
  created_at: string;
  upvotes: number;
  reply_count?: number; // Calculated on fetch
}

export interface ForumPost {
  id: string;
  thread_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}