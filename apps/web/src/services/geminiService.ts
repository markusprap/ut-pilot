
import { AppMode, QuizQuestion, ChatMessage, ResearchResult } from "../types";

export type NoteComplexity = 'NORMAL' | 'EASY' | 'VERY_EASY';

const API_BASE_URL = '/api/gemini';



// Helper to get Auth Header
const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// TAHAP 1: Upload File ke Backend (yang akan upload ke Gemini)
import { supabase } from "./supabase";

// TAHAP 1: Upload File ke Supabase Storage -> Backend Process
export const uploadFileToGemini = async (file: File): Promise<{ fileUri: string; mimeType: string; storageUrl?: string }> => {
    try {


        // 1. Prepare Path
        // Use a random folder or user folder if available. 
        // Since we might be Anon, let's use a 'public/temp' or random folder if no user.
        // Better: always use a random UUID prefix to avoid collisions.
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        // 2. Upload to Supabase Storage ('modules' bucket)
        // Ensure the bucket 'modules' exists and is Public or RLS allows upload!
        const { data, error: uploadError } = await supabase.storage
            .from('modules')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error("Supabase Upload Error:", uploadError);
            throw new Error(`Gagal upload ke Storage: ${uploadError.message}`);
        }

        if (!data?.path) {
            throw new Error("Upload berhasil tapi path tidak ditemukan.");
        }

        const storagePath = data.path;

        const { data: publicUrlData } = supabase.storage.from('modules').getPublicUrl(storagePath);
        const storagePublicUrl = publicUrlData?.publicUrl;


        // 3. Trigger Backend to Process (Download from Supabase -> Upload to Gemini)
        const authHeader = await getAuthHeader();
        const processResponse = await fetch(`${API_BASE_URL}/upload/process-stored`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader
            },
            body: JSON.stringify({
                filePath: storagePath,
                mimeType: 'application/pdf', // Force PDF for now as per req
                displayName: file.name
            })
        });

        if (!processResponse.ok) {
            const err = await processResponse.json();
            throw new Error(err.error || 'Gagal memproses file di backend.');
        }

        const result = await processResponse.json();


        return {
            fileUri: result.fileUri,
            mimeType: result.mimeType || 'application/pdf',
            storageUrl: storagePublicUrl // NEW: Add the Supabase Storage URL
        };

    } catch (error: any) {
        console.error("Upload Flow Error:", error);
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
    subType: 'NOTES' | 'QUIZ' | 'TOC' = 'NOTES',
    complexity: NoteComplexity = 'NORMAL',
    userId?: string,     // NEW
    userEmail?: string   // NEW
): Promise<string | QuizQuestion[]> => {

    try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader
            },
            body: JSON.stringify({
                fileUri,
                mimeType,
                mode, // Note: Backend expects 'STUDY_SESSION' | 'EXAM_SIMULATION'. Ensure AppMode matches or map it.
                chapterNumber,
                subType,
                userId,     // NEW
                userEmail   // NEW
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

        // CHECK IMMEDIATE RESULT (Serverless Mode)
        if (data.status === 'completed' && data.result) {
            return data.result;
        }

        const { jobId } = data;

        if (!jobId) {
            throw new Error("No Job ID returned.");
        }

        // Poll for status
        const pollInterval = 2000; // 2 seconds
        const maxAttempts = 60; // 2 minutes timeout

        for (let i = 0; i < maxAttempts; i++) {
            const statusResponse = await fetch(`${API_BASE_URL}/status/${jobId}`);
            if (!statusResponse.ok) {
                // Ignore 404/500 transiently or throw? 
                // In serverless, 404 might mean job lost.
                throw new Error('Failed to check job status');
            }

            const statusData = await statusResponse.json();

            if (statusData.status === 'completed') {
                return statusData.result;
            }

            if (statusData.status === 'failed') {
                throw new Error(statusData.error || 'Job failed');
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        throw new Error('Timeout waiting for generation');

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
        const authHeader = await getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader
            },
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
        const authHeader = await getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader
            },
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

// HELPER: Get Quota Status
export const getQuotaStatus = async (userId: string): Promise<{ usage: number, limit: number, remaining: number }> => {
    try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/quota/${userId}`, {
            headers: { ...authHeader }
        });
        if (!response.ok) throw new Error("Failed to fetch quota");
        return await response.json();
    } catch (e) {
        console.error("Quota Fetch Error:", e);
        // Fallback for UI safely
        return { usage: 0, limit: 5, remaining: 5 };
    }
};

// HELPER: Increment Quota Explicitly
export const incrementUserQuota = async (userId: string, userEmail: string): Promise<void> => {
    try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/quota/increment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader
            },
            body: JSON.stringify({ userId, userEmail })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Quota limit reached");
        }
    } catch (e: any) {
        console.error("Increment Quota Error:", e);
        throw e;
    }
};

// === PARTNER DISKUSI (NEW FEATURE) ===

// Langkah 1 & 2: User input soal -> AI Google Search -> Riset & Sumber
export const generateDiscussionResearch = async (question: string, userName: string = "Mahasiswa"): Promise<ResearchResult> => {
    try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/discussion?type=research`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader
            },
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
        const authHeader = await getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/discussion?type=final`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader
            },
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

// === BANK SOAL (SHARED QUESTION BANK) ===

export const fetchQuestionsFromBank = async (courseCode: string, chapter?: number, limit: number = 45): Promise<QuizQuestion[] | null> => {
    try {


        // Use RPC if available for true randomization, BUT ONLY IF NO CHAPTER Filter is needed
        // (Because current get_random_questions RPC intentionally scans entire bank for exams)
        // If chapter is provided, we MUST use standard select to filter by chapter.
        let rpcData = null;
        let rpcError = null;

        if (!chapter) {
            const { data, error } = await supabase.rpc('get_random_questions', {
                p_course_code: courseCode,
                p_limit: limit
            });
            rpcData = data;
            rpcError = error;
        }

        // Fallback or Normal Select (If chapter specified OR RPC failed/skipped)
        if (chapter || rpcError || !rpcData || rpcData.length === 0) {

            // Only warn if it's a real error AND we tried RPC
            if (rpcError && !chapter) {
                console.warn("[BankSoal] RPC 'get_random_questions' unused or failed, falling back to standard select.", rpcError.message);
            }

            let query = supabase
                .from('question_bank')
                .select('*')
                .eq('course_code', courseCode);

            if (chapter) {
                query = query.eq('chapter', chapter);
            }

            // Note: Standard select cannot randomize efficiently without fetching all.
            // We fetch up to 100 and shuffle client side as fallback.
            const { data: fallbackData, error: fallbackError } = await query.limit(100);

            if (fallbackError) throw fallbackError;

            if (!fallbackData || fallbackData.length === 0) return null;

            // Client-side shuffle fallback
            const shuffled = fallbackData.sort(() => 0.5 - Math.random()).slice(0, limit);

            return shuffled.map((q: any) => ({
                id: Math.floor(Math.random() * 1000000), // Temp number ID for frontend compatibility
                db_id: q.id, // Store real DB ID
                question: q.question,
                options: q.options,
                correct_index: q.correct_index,
                explanation: q.explanation,
                image_url: q.image_url, // Pass image url
                image_prompt: q.image_prompt // Pass prompt
            }));
        }

        // Map RPC result
        return rpcData.map((q: any) => ({
            id: Math.floor(Math.random() * 1000000),
            db_id: q.id,
            question: q.question,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation,
            image_url: q.image_url,
            image_prompt: q.image_prompt
        }));

    } catch (e) {
        console.error("Fetch from bank failed:", e);
        return null;
    }
};

export const saveQuestionsToBank = async (courseCode: string, chapter: number, questions: QuizQuestion[], userId: string) => {
    if (!questions || questions.length === 0) return;

    try {
        const rows = questions.map(q => ({
            course_code: courseCode,
            chapter: chapter,
            question: q.question,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation,
            created_by: userId
        }));

        const { error } = await supabase.from('question_bank').insert(rows);
        if (error) throw error;
    } catch (e) {
        console.error("Failed to save to bank:", e);
    }
};

// TAHAP 5: Image Generation (Imagen 3)
export const generateImage = async (prompt: string, courseCode: string, db_id?: string): Promise<string> => {
    try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/generate-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader
            },
            body: JSON.stringify({
                prompt,
                courseCode,
                db_id
            })
        });

        if (!response.ok) {
            throw new Error("Image generation failed");
        }

        const data = await response.json();
        return data.imageUrl;
    } catch (error) {
        console.error("Generate Image Error:", error);
        throw error;
    }
};
