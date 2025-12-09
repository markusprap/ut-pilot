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

export interface UploadFileResponse {
  fileUri: string;
  mimeType: string;
}

export interface GenerateContentRequest {
  fileUri: string;
  mimeType: string;
  mode: 'STUDY_SESSION' | 'EXAM_SIMULATION';
  chapterNumber?: number;
  subType?: 'NOTES' | 'QUIZ';
  userId?: string;
  userEmail?: string;
}

export interface AnalyzeExamRequest {
  questions: QuizQuestion[];
  userAnswers: number[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatRequest {
  history: ChatMessage[];
  message: string;
  userName?: string;
  contextMaterial?: string;
}

export interface ResearchResult {
  text: string;
  sources: { uri: string; title: string }[];
}

export interface DiscussionResearchRequest {
  question: string;
  userName?: string;
}

export interface DiscussionFinalRequest {
  question: string;
  researchResult: string;
  userPoints: string;
  userName?: string;
}
