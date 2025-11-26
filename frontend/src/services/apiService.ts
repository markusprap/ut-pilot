import { QuizQuestion } from '../types';

const API_BASE_URL = '/api/gemini';

// Get Google Gemini API key from backend
const getApiKey = async (): Promise<string> => {
  const response = await fetch('/api/get-api-key');
  if (!response.ok) throw new Error('Failed to get API key');
  const data = await response.json();
  return data.apiKey;
};

// Upload directly to Google Gemini File API (bypass Vercel limit)
export const uploadFileToGemini = async (file: File): Promise<{ fileUri: string; mimeType: string }> => {
  try {
    const apiKey = await getApiKey();
    
    // Use Google Gemini Files API directly
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const uploadData = await uploadResponse.json();
    const fileUri = uploadData.file.uri;
    
    // Poll until file is processed
    let file_status = uploadData.file.state;
    let attempts = 0;
    const maxAttempts = 60;

    while (file_status === 'PROCESSING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${uploadData.file.name}?key=${apiKey}`
      );
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        file_status = statusData.state;
      }
      
      attempts++;
    }

    if (file_status !== 'ACTIVE') {
      throw new Error('File processing timeout or failed');
    }

    return {
      fileUri: fileUri,
      mimeType: 'application/pdf'
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(error.message || 'Gagal upload file');
  }
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
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } else {
        const text = await response.text();
        console.error('Generate error response:', text);
        errorMsg = `Server error (${response.status})`;
      }
    } catch (e) {
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
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } else {
        const text = await response.text();
        console.error('Analyze error response:', text);
        errorMsg = `Server error (${response.status})`;
      }
    } catch (e) {
      errorMsg = `Server error (${response.status})`;
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.analysis;
};
