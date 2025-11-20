export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
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
}

export interface AnalyzeExamRequest {
  questions: QuizQuestion[];
  userAnswers: number[];
}
