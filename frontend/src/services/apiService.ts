import { QuizQuestion } from '../types';

const API_BASE_URL = '/api/gemini';

export const uploadFileToGemini = async (file: File): Promise<{ fileUri: string; mimeType: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = 'Gagal upload file';
    try {
      const error = await response.json();
      errorMsg = error.error || errorMsg;
    } catch (e) {
      const text = await response.text();
      console.error('Upload error response:', text);
      errorMsg = `Server error (${response.status})`;
    }
    throw new Error(errorMsg);
  }

  return response.json();
};

export const generateContentFromUri = async (
  fileUri: string,
  mimeType: string,
  mode: 'STUDY_SESSION' | 'EXAM_SIMULATION',
  topic?: string,
  chapterNumber: number = 1,
  subType: 'NOTES' | 'QUIZ' = 'NOTES'
): Promise<string | QuizQuestion[]> => {
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileUri,
      mimeType,
      mode,
      chapterNumber,
      subType,
    }),
  });

  if (!response.ok) {
    let errorMsg = 'Gagal generate konten';
    try {
      const error = await response.json();
      errorMsg = error.error || errorMsg;
    } catch (e) {
      const text = await response.text();
      console.error('Generate error response:', text);
      errorMsg = `Server error (${response.status})`;
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.content;
};

export const analyzeExamPerformance = async (
  questions: QuizQuestion[],
  userAnswers: number[]
): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      questions,
      userAnswers,
    }),
  });

  if (!response.ok) {
    let errorMsg = 'Gagal menganalisis ujian';
    try {
      const error = await response.json();
      errorMsg = error.error || errorMsg;
    } catch (e) {
      const text = await response.text();
      console.error('Analyze error response:', text);
      errorMsg = `Server error (${response.status})`;
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.analysis;
};
