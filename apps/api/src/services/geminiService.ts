import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, ChatMessage, ResearchResult } from "../types/index.js";
import { createClient } from '@supabase/supabase-js';

const SYSTEM_INSTRUCTION = `
Kamu adalah "UT-Pilot", asisten belajar cerdas spesialis mahasiswa Universitas Terbuka (UT).
Tugas utamamu adalah memproses FILE PDF (Modul Digital UT) yang diupload user menjadi bahan belajar.

ATURAN KOMUNIKASI (STRICT & WAJIB):
1. JANGAN PERNAH menggunakan kata sapaan, pembuka, atau penutup (seperti "Tentu", "Berikut adalah", "Semoga membantu", "Halo").
2. LANGSUNG output materi atau JSON sesuai format yang diminta.
3. Bersikaplah formal, akademis, dan objektif.
4. Gunakan Bahasa Indonesia yang baik dan benar (EYD).

=== MODE BELAJAR (STUDY SESSION) ===
1. NOTES (Rangkuman):
   - Format: Judul Modul -> Ringkasan Inti -> [Kegiatan Belajar per KB] -> Rangkuman.
   - Gunakan format Markdown yang rapi dengan hierarki (Heading 2, Heading 3).
   - Gunakan Heading 3 (###) untuk memisahkan Kegiatan Belajar (KB) atau sub-bab.
   - PENTING - RINGKASAN INTI & RANGKUMAN HARUS SUBSTANTIF:
     * JANGAN hanya mendeskripsikan "modul ini membahas tentang..." atau "mahasiswa mempelajari..."
     * TULIS LANGSUNG penjelasan materi dengan detil: definisi, rumus, konsep, contoh konkret.
     * Ringkasan Inti = Penjelasan singkat SEMUA konsep utama dengan rumus/definisi lengkap.
     * Rangkuman = Poin-poin kunci yang bisa langsung dipelajari, bukan deskripsi meta.
   - PRIORITASKAN kedalaman materi daripada panjang kata. Lebih baik pendek tapi padat.

2. QUIZ (Latihan Soal):
   - UTAMAKAN mengambil referensi dari "Tes Formatif" atau "Latihan" yang ada di dalam modul PDF tersebut.
   - Jika ada kunci jawaban di modul, gunakan itu. Jika tidak, analisis sendiri jawabannya.
   - Berikan penjelasan (feedback) yang mendidik.

PENTING: Jangan halusinasi. Semua materi harus berdasarkan konten PDF yang diberikan.
FORMAT MATEMATIKA:
    - GUNAKAN LaTeX untuk semua rumus matematika, fisika, statistik, dan simbol khusus.
    - Format inline: $...$ (Contoh: $E=mc^2$)
    - Format block: $$...$$
    - Jangan gunakan teks biasa untuk rumus (misal: jangan tulis "x kuadrat", tapi tulis $x^2$).

FORMAT KODE PROGRAM (CODE SNIPPET):
    - Jika soal mengandung potongan kode (R, Python, C++, Java, SQL, dll), WAJIB gunakan Markdown Code Block.
    - Format:
      \`\`\`<bahasa>
      kode di sini
      \`\`\`
    - JANGAN menulis kode panjang sebagai teks biasa atau satu baris. Pisahkan agar mudah dibaca.
    - Untuk nama variabel/fungsi dalam teks, gunakan inline code (\`variable\`).
`;

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const ai = new GoogleGenAI({ apiKey });

// Configure Model Constants - USING USER'S HIGH QUOTA PROJECT
// gemini-2.5-flash-lite-preview-09-2025 (Primary - High Quota)
const MODEL_NAME = 'gemini-2.5-flash';
const MODEL_EMERGENCY_BACKUP = 'gemini-2.5-flash-lite';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Priority: Service Role (for Admin tasks like Quota), then Anon (fallback)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials missing in Backend. Storage features may fail.");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// TAHAP 1: Upload File ke Google File API
export const initializeResumableUpload = async (mimeType: string, fileSize: number, displayName: string): Promise<string> => {
    try {
        console.log(`Initializing resumable upload for: ${displayName}`);

        const response = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': fileSize.toString(),
                'X-Goog-Upload-Header-Content-Type': mimeType,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file: {
                    display_name: displayName,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to initialize upload: ${response.statusText} - ${errorText}`);
        }

        const uploadUrl = response.headers.get('x-goog-upload-url');
        if (!uploadUrl) {
            throw new Error("Google did not return an upload URL.");
        }

        return uploadUrl;

    } catch (error: any) {
        console.error("Init Upload Error:", error);
        throw new Error(error.message || "Gagal menginisialisasi upload.");
    }
};

// Start polling for file active state
export const pollFileState = async (fileUri: string): Promise<void> => {
    // POLLING LOGIC
    let state = 'PROCESSING';
    let attempts = 0;
    const MAX_ATTEMPTS = 60;
    const POLLING_INTERVAL = 2000;

    // Extract name from URI (files/xxx)
    const resourceName = fileUri.split('/').pop();
    if (!resourceName) return;

    while (state === 'PROCESSING' && attempts < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));

        try {
            const fileResource = await ai.files.get({ name: resourceName }) as any;
            state = fileResource.state;
            attempts++;

            console.log(`Polling attempt ${attempts}: State = ${state}`);

            if (state === 'FAILED') {
                throw new Error("Google Server gagal memproses PDF ini (State: FAILED).");
            }
            if (state === 'ACTIVE') {
                return;
            }
        } catch (e) {
            console.warn("Error checking file state (transient), retrying...", e);
        }
    }

    throw new Error(`Timeout: File processing took too long.`);
}

export const uploadFileToGemini = async (fileBuffer: Buffer, originalName: string): Promise<{ fileUri: string; mimeType: string }> => {
    try {
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const mimeType = 'application/pdf';
        const fileSize = fileBuffer.length;

        // 1. Init Resumable Upload
        const uploadUrl = await initializeResumableUpload(mimeType, fileSize, sanitizedName);

        // 2. Upload Content (Using robust fetch with headers)
        console.log(`Uploading ${fileSize} bytes to Gemini...`);

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Length': fileSize.toString(),
                'Content-Type': mimeType,
                'X-Goog-Upload-Command': 'upload, finalize',
                'X-Goog-Upload-Offset': '0'
            },
            body: fileBuffer
        });

        if (!response.ok) {
            const txt = await response.text();
            console.error(`Google Upload Error Body:`, txt);
            throw new Error(`Google Upload Failed: ${response.status} - ${txt}`);
        }

        const result = await response.json() as any;

        if (!result.file || !result.file.uri) {
            throw new Error("Upload completed but Valid File URI not found in response.");
        }

        console.log("Gemini Upload Success:", result.file.uri);

        return {
            fileUri: result.file.uri,
            mimeType: result.file.mimeType || mimeType
        };

    } catch (e: any) {
        console.error("uploadFileToGemini Error:", e);
        throw e;
    }
};

// WRAPPER: Retry Logic for Model Handling (with 503/Overload Support)
const generateWithRetry = async (config: any, retries = 2): Promise<any> => {
    try {
        console.log(`Generating with Model: ${config.model}`);
        return await ai.models.generateContent(config);
    } catch (e: any) {
        console.warn(`Model ${config.model} FAILED:`, e.message || e);

        // Check for retry-able errors: 404 (Not Found), 429 (Quota), 503 (Overloaded)
        const isRetryable =
            e.message?.includes("not found") ||
            e.message?.includes("404") ||
            e.message?.includes("429") ||
            e.message?.includes("503") ||
            e.message?.includes("overloaded") ||
            e.message?.includes("UNAVAILABLE") ||
            e.status === 404 ||
            e.status === 429 ||
            e.status === 503;

        if (retries > 0 && isRetryable) {
            // Wait before retry (exponential backoff: 2s, 4s)
            const waitTime = (3 - retries) * 2000;
            console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // If still failing, try backup model
            if (retries === 1 && config.model !== MODEL_EMERGENCY_BACKUP) {
                console.log(`⚠️ Switching to BACKUP MODEL: ${MODEL_EMERGENCY_BACKUP} ...`);
                const newConfig = { ...config, model: MODEL_EMERGENCY_BACKUP };
                return await generateWithRetry(newConfig, retries - 1);
            }

            return await generateWithRetry(config, retries - 1);
        }
        throw e;
    }
};

// TAHAP 1.5: Quota Management (Basic Users Limit)
export const checkAndIncrementQuota = async (userId: string, email: string): Promise<void> => {
    // 1. Admin/Premium Check (Unlimited)
    const ADMIN_EMAILS = [
        "prapkurniawanmarkus@gmail.com",
        "ut-pilot-admin@ut.ac.id"
    ];
    if (ADMIN_EMAILS.includes(email)) {
        console.log(`[QUOTA] User ${email} is ADMIN/PREMIUM. Quota skipped.`);
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    // 2. Fetch Usage
    const { data: record, error } = await supabase
        .from('user_daily_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Quota Fetch Error:", error);
        // Fail open or closed? Let's fail open for now to avoid blocking on DB error, 
        // BUT warning log. 
        // Or safer: Don't block if DB error, but this is a limit feature.
        // Let's Log and Continue to be safe for user experience if DB flakes.
        return;
    }

    let dailyCount = 0;

    if (record) {
        if (record.last_reset_date !== today) {
            // New day, reset happens on upsert logic effectively or variable
            dailyCount = 0;
        } else {
            dailyCount = record.usage_count;
        }
    }

    console.log(`[QUOTA] User ${email} Usage Today: ${dailyCount}/3`);

    // 3. Enforce Limit
    if (dailyCount >= 5) {
        throw new Error("Quota Harian Habis! (Max 5x Exam/Hari). Upgrade ke Premium atau tunggu besok ya Bro! 🕒");
    }

    // 4. Increment
    const { error: upsertError } = await supabase
        .from('user_daily_usage')
        .upsert({
            user_id: userId,
            email: email,
            usage_count: dailyCount + 1,
            last_reset_date: today
        }, { onConflict: 'user_id' });

    if (upsertError) {
        console.error("Quota Upsert Error:", upsertError);
        // Don't block flow on metric save error
    }
};

// Start of New Function
export const getQuotaStatus = async (userId: string): Promise<{ usage: number, limit: number, remaining: number }> => {
    // Return early if no userId for sanity
    if (!userId) return { usage: 0, limit: 5, remaining: 5 };

    const today = new Date().toISOString().split('T')[0];
    const { data: record } = await supabase
        .from('user_daily_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

    let usage = 0;
    if (record && record.last_reset_date === today) {
        usage = record.usage_count;
    }

    return {
        usage,
        limit: 5,
        remaining: Math.max(0, 5 - usage)
    };
};
// End of New Function

// === QUESTION BANK (SHARED REPOSITORY) ===

const normalizeCourseCode = (code: string): string => {
    // Remove spaces, dots, dashes and uppercase: "M.SII-M 4310" -> "MSIM4310"
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const saveQuestionsToBank = async (courseCode: string, chapter: number, questions: QuizQuestion[], userId: string): Promise<void> => {
    try {
        const cleanCode = normalizeCourseCode(courseCode);
        if (!cleanCode || questions.length === 0) return;

        console.log(`[BANK] Saving ${questions.length} questions for ${cleanCode} Ch ${chapter} by ${userId}`);

        // Prepare bulk insert data
        const rows = questions.map(q => ({
            course_code: cleanCode,
            chapter: chapter,
            question: q.question,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation,
            created_by: userId
        }));

        const { error } = await supabase.from('question_bank').insert(rows);

        if (error) {
            console.error("Failed to save to Bank:", error);
        } else {
            console.log("[BANK] Successfully saved to Question Bank.");
        }
    } catch (e) {
        console.error("Bank Save Exception:", e);
    }
};

export const fetchQuestionsFromBank = async (courseCode: string, chapter: number, limit: number = 10): Promise<QuizQuestion[] | null> => {
    try {
        const cleanCode = normalizeCourseCode(courseCode);
        console.log(`[BANK] Fetching questions for ${cleanCode} Ch ${chapter}`);

        // Fetch random rows? Supabase doesn't support RANDOM() easily via JS SDK without RPC.
        // For now, fetch latest 50 and shuffle client side.
        const { data, error } = await supabase
            .from('question_bank')
            .select('*')
            .eq('course_code', cleanCode)
            .eq('chapter', chapter)
            .limit(50);

        if (error || !data || data.length === 0) {
            // console.log("Bank miss or error:", error);
            return null;
        }

        console.log(`[BANK] Found ${data.length} questions in bank.`);

        // Map to QuizQuestion type
        const mappedQuestions: QuizQuestion[] = data.map((row: any, index: number) => ({
            id: index + 1, // Re-index for frontend consistency
            db_id: row.id, // Real DB ID for updates
            question: row.question,
            options: row.options,
            correct_index: row.correct_index,
            explanation: row.explanation,
            image_prompt: undefined, // Bank doesn't store prompts yet (or maybe it should? For now undefined)
            image_url: row.image_url // Load existing image if any
        }));

        // Shuffle and Limit
        const shuffled = mappedQuestions.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, limit);

    } catch (e) {
        console.error("Bank Fetch Exception:", e);
        return null;
    }
};

// End of Question Bank Logic

// TAHAP 2: Generate Content
export const generateContentFromUri = async (
    fileUri: string,
    mimeType: string,
    mode: 'STUDY_SESSION' | 'EXAM_SIMULATION',
    chapterNumber: number = 1,
    subType: 'NOTES' | 'QUIZ' | 'TOC' = 'NOTES',
    userId?: string,
    userEmail?: string
): Promise<string | QuizQuestion[] | any[]> => {

    // ENFORCE QUOTA ONLY FOR EXAM SIMULATION
    if (mode === 'EXAM_SIMULATION' && userId && userEmail) {
        await checkAndIncrementQuota(userId, userEmail);
    }

    // Default to Primary Model
    let modelName = MODEL_NAME;
    let prompt = "";
    let isJsonMode = false;

    if (mode === 'STUDY_SESSION') {
        if (subType === 'NOTES') {
            prompt = `TUGAS: Buat Ringkasan Materi (Smart Notes) untuk MODUL atau BAB KE-${chapterNumber}.
          
          INSTRUKSI STRUKTUR (IKUTI FORMAT INI DENGAN KETAT):
          
          # Modul ${chapterNumber}: [Judul Modul Asli]
          
          ## Ringkasan Inti
          Jelaskan materi modul ini dengan alur yang terstruktur.
          
          PENTING:
          - Jika modul terdiri dari beberapa Kegiatan Belajar (KB), pisahkan dengan sub-judul menggunakan Heading 3 (###).
          - Contoh: "### KB 1: Konsep Dasar" lalu jelaskan isinya.
          - JANGAN membuat satu list bullet points raksasa. Gunakan paragraf pendek untuk pengantar, lalu poin-poin untuk rincian.
          - Buat materi mudah dibaca tapi tetap mendalam.
          - Gunakan format Markdown standard (*italic*, **bold**, list -, dll).
          
          ## Rangkuman
          Simpulan padat (1-2 paragraf) mengenai poin kunci yang harus diingat mahasiswa dari modul ini.
          
          CONSTRAINT:
          - TIDAK PERLU "Tujuan Pembelajaran" atau "Glosarium".
          - Langsung ke materi inti.
          - Bahasa Formal Akademik.`;
            isJsonMode = false;
        } else if (subType === 'QUIZ') {
            prompt = `TUGAS: Ekstrak SEMUA Soal dari "Tes Formatif" di MODUL/BAB KE-${chapterNumber}.

          INSTRUKSI DETAIL:
          1. SCAN seluruh Modul ${chapterNumber} dan cari SETIAP bagian "Tes Formatif" dari masing-masing Kegiatan Belajar (KB).
          2. EKSTRAK SEMUA SOAL dari setiap Tes Formatif yang ditemukan (biasanya 10 soal per KB, tapi jumlahnya bisa bervariasi).
          3. Jika ada 3 KB dengan masing-masing 10 soal = 30 soal total. Sesuaikan dengan jumlah KB yang ada di modul ini.
          4. Untuk SETIAP soal yang diekstrak:
             - Tulis ulang soal dengan jelas. JIKA SOAL MENGANDUNG KODE, FORMAT SEBAGAI MARKDOWN CODE BLOCK.
             - Tulis semua opsi jawaban (A, B, C, D, E jika ada). JIKA OPSI ADALAH KODE, GUNAKAN INLINE CODE (\`code\`) ATAU BLOCK.
             - ANALISIS SENDIRI jawaban yang benar berdasarkan materi modul (JANGAN PERCAYA kunci jawaban modul karena sering SALAH)
             - Berikan penjelasan mengapa jawaban tersebut benar, berdasarkan materi di modul
          
          ⚠️ ATURAN KRITIS (WAJIB DIPATUHI):
          - **CROSS-CHECK**: Setelah menulis 'explanation', PERIKSA ULANG apakah 'correct_index' sesuai dengan logika di explanation!
          - **CONTOH KESALAHAN YANG HARUS DIHINDARI**: Jika explanation menyatakan "opsi A adalah jawaban yang benar karena...", maka 'correct_index' HARUS 0 (index untuk opsi A).
          - **JANGAN COPY KUNCI JAWABAN MODUL**: Kunci jawaban di modul sering SALAH! Analisis ulang berdasarkan materi.
          - Jika soal memiliki kata "TIDAK", "BUKAN", atau "KECUALI", hati-hati! Jawaban benar adalah opsi yang BERBEDA dari yang lain.
          - Prioritas utama adalah Tes Formatif, bukan Latihan atau soal lain
          - Jika soal memerlukan gambar/grafik dari modul, deskripsikan gambar tersebut di field 'image_prompt'
          - PASTIKAN CODE SNIPPET (jika ada) terformat rapi dengan \`\`\`language.
          
          FORMAT OUTPUT: JSON Array berisi SEMUA objek soal yang ditemukan.
          Field 'explanation' WAJIB berisi pembahasan singkat & jelas kenapa jawaban itu benar, sertakan sumber "Berdasarkan materi KB X".
          Field 'image_prompt' (OPSIONAL): Deskripsi visual jika soal membutuhkan gambar.`;
            isJsonMode = true;
        } else if (subType === 'TOC') {
            prompt = `TUGAS: Analisis Struktur Daftar Isi (Table of Contents) dari Modul ini.
            
            INSTRUKSI:
            1. Identifikasi Total Jumlah Modul (Bab) yang ada dalam file ini.
            2. Ekstrak Nomor Modul dan Judul Modulnya.
            3. Abaikan halaman pengantar, daftar pustaka, atau lampiran. Fokus pada MODUL 1, MODUL 2, dst.
            4. Jika formatnya "Bab 1", "Bab 2", anggap itu sebagai Modul.
            
            FORMAT OUTPUT: JSON Array.
            [{ "chapter": 1, "title": "Judul Modul 1" }, { "chapter": 2, "title": "Judul Modul 2" }, ...]
            `;
            isJsonMode = true;
        }
    } else if (mode === 'EXAM_SIMULATION') {
        prompt = `Buatkan "EXAM SIMULATION" (Simulasi UAS) sebanyak 45 SOAL.
      
      INSTRUKSI:
      1. Sampling materi secara MERATA dari BAB AWAL sampai BAB AKHIR dalam file PDF ini.
      2. Prioritaskan soal-soal studi kasus atau pemahaman konsep (C3-C4).
      3. Pastikan field 'explanation' mencantumkan dari Modul mana soal tersebut berasal (Contoh: "Berdasarkan Modul 3 KB 1, ...").
      3. Pastikan field 'explanation' mencantumkan dari Modul mana soal tersebut berasal (Contoh: "Berdasarkan Modul 3 KB 1, ...").
      4. Soal harus menantang setara Ujian Akhir Semester Universitas Terbuka.
      5. Jika soal mengandung coding (R/Python/dll), GUNAKAN FORMAT MARKDOWN CODE BLOCK agar rapi.
      6. Pastikan output adalah valid JSON Array dengan panjang 45 item.
      
      FORMAT: JSON Array 45 objek.`;
        isJsonMode = true;
    }

    const contentPart = {
        fileData: {
            fileUri: fileUri,
            mimeType: mimeType,
        }
    };

    const textPart = { text: prompt };

    try {
        const requestConfig: any = {
            model: modelName,
            contents: {
                parts: [contentPart, textPart]
            },
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
                ]
            }
        };

        if (isJsonMode) {
            requestConfig.config.responseMimeType = "application/json";

            // DYNAMIC SCHEMA BASED ON SUBTYPE
            if (subType === 'TOC') {
                requestConfig.config.responseSchema = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            chapter: { type: Type.INTEGER },
                            title: { type: Type.STRING }
                        },
                        required: ["chapter", "title"]
                    }
                };
            } else {
                // Default Quiz Schema (for QUIZ and EXAM_SIMULATION)
                requestConfig.config.responseSchema = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.INTEGER },
                            question: { type: Type.STRING },
                            options: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            },
                            correct_index: { type: Type.INTEGER },
                            explanation: { type: Type.STRING },
                            image_prompt: { type: Type.STRING }
                        },
                        required: ["id", "question", "options", "correct_index", "explanation"]
                    }
                };
            }
        }

        console.log("Generating content...");
        const response = await generateWithRetry(requestConfig);

        if (!response || !response.text) {
            throw new Error("AI tidak memberikan respon teks. Mohon coba lagi dalam beberapa saat.");
        }

        const textResponse = response.text;

        if (isJsonMode) {
            const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson) as QuizQuestion[];
        }

        return textResponse.replace(/^```markdown/g, '').replace(/^```/g, '').replace(/```$/g, '').trim();

    } catch (error: any) {
        console.error("Generation Error:", error);
        throw error;
    }
};

// TAHAP 3: Analisis Hasil Ujian
export const analyzeExamPerformance = async (questions: QuizQuestion[], userAnswers: number[]): Promise<string> => {
    const wrongAnswers = questions.filter((q, index) => userAnswers[index] !== q.correct_index);

    if (wrongAnswers.length === 0) {
        return "Selamat! Anda menjawab semua soal dengan benar. Anda sudah sangat menguasai materi modul ini.";
    }

    const sampleWrong = wrongAnswers.slice(0, 20);
    const wrongSummary = sampleWrong.map(q =>
        `- Soal: ${q.question.substring(0, 80)}... | Jawaban Benar di Opsi ke: ${q.correct_index + 1} | Penjelasan: ${q.explanation}`
    ).join('\n');

    const prompt = `
    Saya baru saja mengerjakan Simulasi Ujian (UAS) dari sebuah Modul Mata Kuliah Universitas Terbuka.
    Skor saya: ${questions.length - wrongAnswers.length} dari ${questions.length}.
    
    Berikut adalah sampel soal yang SAYA JAWAB SALAH:

    ${wrongSummary}

    TUGAS:
    Buat analisis SINGKAT maksimal 5 kalimat dalam 1 paragraf yang berisi:
    1. Pola kesalahan utama (topik/modul mana yang lemah)
    2. Saran belajar spesifik untuk memperbaiki kelemahan
    
    FORMAT OUTPUT (WAJIB):
    - PLAIN TEXT biasa (TANPA markdown: jangan pakai #, *, **, -, dll)
    - 1 paragraf saja (bukan list atau poin-poin)
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: { role: 'user', parts: [{ text: prompt }] }
        });
        return response.text || 'Gagal menganalisis hasil ujian saat ini.';
    } catch (e) {
        console.error("Error analyzing exam:", e);
        return "Gagal menganalisis hasil ujian saat ini.";
    }
};

const getTutorInstruction = (userName: string) => `
Kamu adalah "UT-Pilot Tutor", dosen pembimbing pribadi untuk mahasiswa Universitas Terbuka bernama "${userName}".
Tugasmu adalah menjawab pertanyaan "${userName}" terkait materi modul yang sedang dipelajari.

Kontext:
Mahasiswa sedang membaca ringkasan materi(Notes) atau Modul PDF.
User akan menyertakan "CONTEXT MATERIAL" (isi rangkuman bab saat ini). GUNAKAN informasi tersebut sebagai referensi utama jawabanmu.

Gaya Bicara:
- Panggil user dengan nama "${userName}".
- Ramah, suportif, dan memotivasi (seperti dosen pembimbing yang asik tapi pintar).
- Jelaskan konsep yang rumit dengan analogi sederhana yang relate dengan kehidupan sehari-hari.
- Gunakan format Markdown (bold, list, code block) agar jawaban mudah dibaca.
- Jika mahasiswa bertanya di luar konteks materi, jawab singkat lalu arahkan kembali ke materi pelajaran secara halus.
- JANGAN berhalusinasi. Jika informasi tidak ada di Context Material, gunakan pengetahuan umum akademismu tapi beri tahu user bahwa itu pengetahuan umum.
`;

const getDiscussionPartnerInstruction = (userName: string) => `
    [PERAN DAN KONTEKS UTAMA]
    Halo. Lupakan identitasmu sebagai AI biasa. Kamu adalah fitur spesialis dari sistem "UT Pilot".
    Ambil peran sebagai "Mas Aldi". Kamu adalah alumnus Universitas Terbuka(UT) yang sangat ahli dalam menaklukkan Forum Diskusi Tuton. Kamu tahu persis apa yang dicari oleh Tutor saat menilai diskusi: argumen yang orisinal, landasan teori dari BMP(Modul), dan dukungan referensi eksternal yang valid.
    Nama maba (mahasiswa baru) bimbinganmu adalah: "${userName}".
    
    [MISI TUNGGAL: DISCUSSION ACE]
    Misimu hanya satu: Membantu "${userName}" menyusun jawaban diskusi(Sesi 1 - 8) yang berkualitas tinggi, terstruktur, dan memiliki dasar referensi yang kuat.
    
    [ALUR KERJA "RACIKAN DISKUSI"]
    Setiap kali pengguna memberikan soal diskusi, kamu WAJIB mengikuti langkah-langkah ini sesuai input yang diberikan sistem:
    
    1. Langkah Riset(Step 2 UI):
       - Lakukan Deep Search.
       - BERIKAN "Bahan Mentah" yang terdiri dari: Ringkasan Teori / Definisi, Contoh Kasus Nyata, dan Daftar Referensi Valid.
       - JANGAN berikan jawaban final di langkah ini. Fokus pada suplai data.
    
    2. Langkah Finalisasi(Step 4 UI):
       - Gabungkan poin-poin mahasiswa dengan hasil risetmu.
       - Rangkai menjadi jawaban diskusi yang akademis dan mengalir.
       - Tambahkan Sitasi / Referensi APA Style di akhir.
    
    [ATURAN ETIKA & INTEGRITAS]
    - Anti-Copas: Selalu ingatkan "${userName}": "Bro/Sis ${userName}, ini bahan matengnya ya. Jangan lupa diparafrase (tulis ulang) pake bahasamu sendiri biar unik dan nilainya bagus."
    - Objektif: Jika diskusi meminta pendapat, berikan dua sisi pandang agar pengguna bisa memilih.
    
    [GAYA KOMUNIKASI]
    - Singkat, padat, berisi.
    - Gunakan bullet points agar mudah dibaca cepat.
    - Nada bicara: Membantu, cerdas, tapi santai("Bro", "Kak", "${userName}").
`;

// TAHAP 4: Chat AI Tutor (Stateless for Serverless Compatibility)
export const sendChatToTutor = async (history: ChatMessage[], newMessage: string, userName: string = "Mahasiswa", contextMaterial?: string): Promise<string> => {

    // Build conversation history as content parts
    const conversationHistory = [
        // System context as first user message
        {
            role: 'user' as const,
            parts: [{
                text: `SYSTEM CONTEXT (Hidden):
                Berikut adalah materi yang sedang dibaca user (CONTEXT MATERIAL). 
                Gunakan ini sebagai referensi utama jawabanmu jika relevan.
                Jika user bertanya tentang hal yang ada di sini, jelaskan berdasarkan teks ini.
                
                --- MULAI CONTEXT MATERIAL ---
        ${contextMaterial ? contextMaterial.substring(0, 15000) : "Tidak ada materi spesifik yang sedang dibuka."}
    --- SELESAI CONTEXT MATERIAL --- ` }]
        },
        {
            role: 'model' as const,
            parts: [{ text: `Dimengerti. Saya siap menjawab pertanyaan ${userName} berdasarkan konteks materi tersebut dengan gaya dosen pembimbing yang ramah.` }]
        },
        // Map existing history
        ...history.map(msg => ({
            role: msg.role as 'user' | 'model',
            parts: [{ text: msg.text }]
        })),
        // Add new message
        {
            role: 'user' as const,
            parts: [{ text: newMessage }]
        }
    ];

    try {
        const response = await generateWithRetry({
            model: MODEL_NAME,
            contents: conversationHistory,
            config: {
                systemInstruction: getTutorInstruction(userName),
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            }
        });

        return response.text || "Maaf, saya tidak bisa menjawab saat ini.";
    } catch (error: any) {
        console.error("Chat Error:", error);
        // More specific error handling
        if (error.message?.includes("429") || error.message?.includes("quota")) {
            throw new Error("Maaf, server sedang sibuk. Mohon tunggu 1-2 menit lalu coba lagi.");
        }
        throw new Error("Maaf, koneksi ke server AI terganggu. Mohon coba lagi.");
    }
};

// === PARTNER DISKUSI (NEW FEATURE) ===

// Langkah 1 & 2: User input soal -> AI Google Search -> Riset & Sumber
export const generateDiscussionResearch = async (question: string, userName: string = "Mahasiswa"): Promise<ResearchResult> => {
    const promptText = `(Mas Aldi Mode: ON)
    
    Soal Diskusi dari ${userName}: "${question}"
    
    TUGAS MAS ALDI (LANGKAH RISET):
    1. Lakukan deep search tentang topik ini.
    2. Berikan "Bahan Mentah" yang daging banget untuk ${userName}:
       - Ringkasan Sintesis Teori / Definisi (Penting!).
       - Contoh Kasus Nyata (Jika relevan).
       - 3 - 5 Sumber Referensi Valid (APA Style).

    Ingat: JANGAN kasih jawaban final dulu. Kita kasih bahan biar ${userName} mikir dikit.
    Gaya bahasa: Santai, cerdas, mentor.`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: promptText,
            config: {
                tools: [{ googleSearch: {} }], // WAJIB: Gunakan Google Search
                systemInstruction: getDiscussionPartnerInstruction(userName)
            }
        });

        const text = response.text || "";

        // Extract sources from grounding metadata if available
        let sources: { uri: string; title: string }[] = [];
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

        if (groundingChunks) {
            groundingChunks.forEach((chunk: any) => {
                if (chunk.web) {
                    sources.push({ uri: chunk.web.uri, title: chunk.web.title });
                }
            });
        }

        // Deduplicate sources
        sources = sources.filter((v, i, a) => a.findIndex(v2 => (v2.uri === v.uri)) === i);

        return { text, sources };

    } catch (error: any) {
        console.error("Discussion Research Error:", error);

        // Fallback if permission denied (403) or other tool errors
        if (error.toString().includes("403") || error.toString().toLowerCase().includes("permission")) {
            console.warn("Falling back to internal knowledge due to permission error.");
            const fallbackResponse = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: promptText + "\n\n(Note: Akses Google Search lagi error, Mas Aldi pake 'otak' sendiri dulu ya. Data mungkin kurang update tapi konsep aman.)",
                config: {
                    systemInstruction: getDiscussionPartnerInstruction(userName)
                }
            });
            return {
                text: fallbackResponse.text || "",
                sources: []
            };
        }

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
        const prompt = `
        (Mas Aldi Mode: ON - FINALISASI)

    [KONTEKS]
        Soal Awal: "${question}"
        
        Hasil Riset Kita (Bahan Mentah):
    "${researchResult}"

    Ide / Poin dari ${userName}:
    "${userPoints}"

    [TUGAS MAS ALDI]
        Sekarang waktunya 'masak' jawaban final buat ${userName} !
        1. Gabungkan poin-poin ${userName} di atas dengan data riset kita.
        2. Rangkai jadi jawaban diskusi yang flow-nya enak, akademis, dan 'daging'.
        3. Pastikan sitasi / referensi (APA Style) tercantum di bawah.
        4. Tambahkan catatan kaki / disclaimer khas Mas Aldi: "Ini bahan matengnya ya. Jangan lupa diparafrase biar unik!"
        
        Gaya bahasa jawaban: Formal Akademis (untuk diposting).
        Gaya bahasa komentar: Santai (untuk user).
        `;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
                role: 'user',
                parts: [{ text: prompt }]
            }
        });

        return response.text || "Mas Aldi kehabisan kata-kata.";

    } catch (error) {
        console.error("Discussion Finalize Error:", error);
        throw new Error("Mas Aldi gagal menyusun jawaban akhir.");
    }
};



// CORE: Process Stored File (Supabase -> Gemini)
export const processStoredFile = async (filePath: string, mimeType: string, displayName: string): Promise<{ fileUri: string; mimeType: string }> => {
    try {
        console.log(`Processing Stored File: modules/${filePath}`);

        // 1. Download from Supabase
        const { data, error } = await supabase.storage.from('modules').download(filePath);

        if (error || !data) {
            throw new Error(`Supabase Download Failed: ${error?.message || 'No data'}`);
        }

        // 2. Convert Blob to Buffer
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`Downloaded ${buffer.length} bytes. Uploading to Gemini...`);

        // 3. Upload to Gemini
        const result = await uploadFileToGemini(buffer, displayName);

        console.log(`Process Complete. File URI: ${result.fileUri}`);
        return result;

    } catch (e: any) {
        console.error("Imagen Error:", e);
        throw new Error("Gagal generate gambar. " + (e.message || ""));
    }
};

export const updateQuestionImage = async (questionId: string, imageUrl: string): Promise<void> => {
    try {
        console.log(`[BANK] Updating image for Question ${questionId}`);
        const { error } = await supabase
            .from('question_bank') // Ensure table name matches
            .update({ image_url: imageUrl })
            .eq('id', questionId);

        if (error) console.error("DB Update Error:", error);
    } catch (e) {
        console.error("Failed to update question image in DB:", e);
    }
};
// TAHAP 5: Generate Quiz Image (Imagen 3)
export const generateImageService = async (prompt: string, courseCode: string, userId: string = "system"): Promise<string> => {
    try {
        console.log(`[IMAGEN] Generating image for prompt: "${prompt}"`);

        // 1. Generate Image using Imagen 3 model
        const response = await ai.models.generateContent({
            model: 'imagen-3.0-generate-001',
            contents: {
                role: 'user',
                parts: [{ text: prompt }]
            },
            config: {
                // @ts-ignore - sampleCount might be type specific
                sampleCount: 1,
            }
        });

        // Parse Response for Image
        const candidate = response.candidates?.[0];
        const part = candidate?.content?.parts?.[0];

        let base64Image: string | undefined;

        if (part && 'inlineData' in part && part.inlineData) {
            base64Image = part.inlineData.data;
        }

        if (!base64Image) {
            console.error("Imagen Response:", JSON.stringify(response, null, 2));
            throw new Error("No image data returned from Imagen.");
        }

        const buffer = Buffer.from(base64Image, 'base64');

        // 2. Upload to Supabase Storage (quiz-assets bucket)
        const timestamp = Date.now();
        const cleanCode = normalizeCourseCode(courseCode);
        const fileName = `${cleanCode}-${userId}-${timestamp}.jpeg`;
        const filePath = `generated/${fileName}`;

        const { data, error } = await supabase.storage
            .from('quiz-assets')
            .upload(filePath, buffer, {
                contentType: 'image/jpeg',
                upsert: false
            });

        if (error) {
            throw new Error(`Upload storage failed: ${error.message}`);
        }

        // 3. Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from('quiz-assets')
            .getPublicUrl(filePath);

        console.log(`[IMAGEN] Success: ${publicUrlData.publicUrl}`);
        return publicUrlData.publicUrl;

    } catch (e: any) {
        console.error("Imagen Service Error:", e);
        throw new Error("Gagal memproses gambar: " + (e.message || "Unknown error"));
    }
};
