
import { AppMode, QuizQuestion, ChatMessage, ResearchResult } from "../types";

export type NoteComplexity = 'NORMAL' | 'EASY' | 'VERY_EASY';

const API_BASE_URL = '/api/gemini';



// TAHAP 1: Upload File ke Backend (yang akan upload ke Gemini)
export const uploadFileToGemini = async (file: File): Promise<{ fileUri: string; mimeType: string }> => {
    try {
        console.log(`Starting upload for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        // Note: Vercel Serverless has 4.5MB limit. Local Express server has 50MB limit.
        // We remove the frontend check to allow local large file uploads.

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
            // Do NOT set Content-Type header, let browser set it with boundary
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        return {
            fileUri: data.fileUri,
            mimeType: data.mimeType
        };

    } catch (error: any) {
        console.error("Upload Error:", error);
        throw new Error(error.message || "Gagal memproses file.");
    }
};

// TAHAP 2: Generate Content
export const generateContentFromUri = async (
    fileUri: string,
    mimeType: string,
    mode: AppMode,
    userName: string = "Mahasiswa",
    topic?: string,
    chapterNumber: number = 1,
    subType: 'NOTES' | 'QUIZ' = 'NOTES',
    complexity: NoteComplexity = 'NORMAL'
): Promise<string | QuizQuestion[]> => {

    try {
        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileUri,
                mimeType,
                mode, // Note: Backend expects 'STUDY_SESSION' | 'EXAM_SIMULATION'. Ensure AppMode matches or map it.
                chapterNumber,
                subType,
                // complexity is not yet handled in backend generate.ts but we can pass it if we update backend
                // For now backend ignores it or uses default.
                // TODO: Update backend to support complexity
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Generation failed');
        }

        const data = await response.json();
        return data.content;

    } catch (error: any) {
        console.error("Generation Error:", error);

        // Handle Permission Denied (403) specifically
        if (error.message && error.message.includes("403") && error.message.includes("permission")) {
            throw new Error("Akses file ditolak. Sesi Anda mungkin telah berakhir atau API Key telah berubah. Mohon hapus kelas ini dan upload ulang modul PDF Anda.");
        }

        throw error;
    }
};

// TAHAP 3: Analisis Hasil Ujian
export const analyzeExamPerformance = async (questions: QuizQuestion[], userAnswers: number[], userName: string = "Mahasiswa"): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questions,
                userAnswers
            })
        });

        if (!response.ok) {
            return "Gagal menganalisis hasil ujian.";
        }

        const data = await response.json();
        return data.analysis;
    } catch (e) {
        console.error("Error analyzing exam:", e);
        return "Gagal menganalisis hasil ujian saat ini.";
    }
};

// TAHAP 4: Chat AI Tutor
export const sendChatToTutor = async (history: ChatMessage[], newMessage: string, userName: string = "Mahasiswa", contextMaterial?: string): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history,
                message: newMessage,
                userName,
                contextMaterial
            })
        });

        if (!response.ok) {
            throw new Error("Chat failed");
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error("Chat Error:", error);
        throw new Error("Maaf, koneksi ke server AI terganggu. Mohon coba lagi.");
    }
};

// === PARTNER DISKUSI (NEW FEATURE) ===

// Langkah 1 & 2: User input soal -> AI Google Search -> Riset & Sumber
export const generateDiscussionResearch = async (question: string, userName: string = "Mahasiswa"): Promise<ResearchResult> => {
    try {
        const response = await fetch(`${API_BASE_URL}/discussion?type=research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                userName
            })
        });

        if (!response.ok) {
            throw new Error("Research failed");
        }

        return await response.json();
    } catch (error: any) {
        console.error("Discussion Research Error:", error);
        throw new Error("Mas Aldi lagi pusing (Gagal Riset). Cek koneksi internetmu, Bro.");
    }
};

// Langkah 3 & 4: User input poin -> AI menyusun jawaban akhir
export const generateDiscussionFinal = async (
    question: string,
    researchResult: string,
    userPoints: string,
    userName: string = "Mahasiswa"
): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE_URL}/discussion?type=final`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                researchResult,
                userPoints,
                userName
            })
        });

        if (!response.ok) {
            throw new Error("Finalization failed");
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error("Discussion Finalize Error:", error);
        throw new Error("Mas Aldi gagal menyusun jawaban akhir.");
    }
};
