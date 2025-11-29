import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, ChatMessage, ResearchResult } from "../types/index.js";

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
   - HANYA buat bagian: Judul Modul -> Ringkasan Inti -> Rangkuman.
   - Gunakan format Markdown yang rapi dengan hierarki (Heading 2, Heading 3).
   - Gunakan Heading 3 (###) untuk memisahkan Kegiatan Belajar (KB) atau sub-bab.

2. QUIZ (Latihan Soal):
   - UTAMAKAN mengambil referensi dari "Tes Formatif" atau "Latihan" yang ada di dalam modul PDF tersebut.
   - Jika ada kunci jawaban di modul, gunakan itu. Jika tidak, analisis sendiri jawabannya.
   - Berikan penjelasan (feedback) yang mendidik.

PENTING: Jangan halusinasi. Semua materi harus berdasarkan konten PDF yang diberikan.
`;

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const ai = new GoogleGenAI({ apiKey });

// TAHAP 1: Upload File ke Google File API
export const uploadFileToGemini = async (fileBuffer: Buffer, originalName: string): Promise<{ fileUri: string; mimeType: string }> => {
    try {
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        console.log(`Starting upload for file: ${sanitizedName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
        console.log('API Key check:', apiKey ? 'Present ✅' : 'Missing ❌');

        let uploadResponse;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                uploadResponse = await ai.files.upload({
                    file: new File([fileBuffer], sanitizedName, { type: 'application/pdf' }),
                    config: {
                        displayName: sanitizedName,
                        mimeType: 'application/pdf'
                    }
                });
                break;
            } catch (e: any) {
                console.warn(`Upload attempt ${retryCount + 1} failed:`, e);
                retryCount++;
                if (retryCount === maxRetries) {
                    throw new Error(`Gagal upload setelah ${maxRetries} percobaan. Detail: ${e.message}`);
                }
                await new Promise(r => setTimeout(r, 2000 * retryCount));
            }
        }

        const uploadedFile = uploadResponse as any;

        if (!uploadedFile || !uploadedFile.uri) {
            throw new Error(`Gagal upload: Google tidak mengembalikan URI file.`);
        }

        const fileUri = uploadedFile.uri;
        const resourceName = uploadedFile.name;

        console.log(`File uploaded: ${resourceName}, URI: ${fileUri}`);

        // POLLING LOGIC
        let state = uploadedFile.state;
        let attempts = 0;
        const MAX_ATTEMPTS = 60;
        const POLLING_INTERVAL = 5000;

        while (state === 'PROCESSING' && attempts < MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));

            try {
                const fileResource = await ai.files.get({ name: resourceName }) as any;
                const currentFile = fileResource;
                state = currentFile.state;
                attempts++;

                console.log(`Polling attempt ${attempts}: State = ${state}`);

                if (state === 'FAILED') {
                    throw new Error("Google Server gagal memproses PDF ini (State: FAILED).");
                }
            } catch (e) {
                console.warn("Error checking file state (transient), retrying...", e);
            }
        }

        if (state !== 'ACTIVE') {
            throw new Error(`Timeout: File terlalu besar atau server sibuk.`);
        }

        return {
            fileUri: fileUri,
            mimeType: uploadedFile.mimeType || 'application/pdf'
        };

    } catch (error: any) {
        console.error("Upload/Processing Error:", error);
        throw new Error(error.message || "Gagal memproses file.");
    }
};

// TAHAP 2: Generate Content
export const generateContentFromUri = async (
    fileUri: string,
    mimeType: string,
    mode: 'STUDY_SESSION' | 'EXAM_SIMULATION',
    chapterNumber: number = 1,
    subType: 'NOTES' | 'QUIZ' = 'NOTES'
): Promise<string | QuizQuestion[]> => {

    const modelName = 'gemini-2.5-flash';
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
            prompt = `TUGAS: Buatkan 20-25 Soal Pilihan Ganda untuk MODUL/BAB KE-${chapterNumber}.
          
          TUJUAN:
          Membuat "Bank Soal" yang cukup banyak agar mahasiswa bisa latihan berulang kali dengan soal berbeda.
          
          SUMBER SOAL:
          1. Cari bagian "Tes Formatif" atau "Latihan" di dalam Modul ${chapterNumber}. ADAPTASI soal-soal tersebut.
          2. Jika kurang dari 20, buat soal tambahan baru yang relevan berdasarkan materi inti Modul ${chapterNumber}.
          
          FORMAT OUTPUT: JSON Array berisi 20-25 objek soal.
          Field 'explanation' WAJIB berisi pembahasan singkat & jelas kenapa jawaban itu benar.`;
            isJsonMode = true;
        }
    } else if (mode === 'EXAM_SIMULATION') {
        prompt = `Buatkan "EXAM SIMULATION" (Simulasi UAS) sebanyak 45 SOAL.
      
      INSTRUKSI:
      1. Sampling materi secara MERATA dari BAB AWAL sampai BAB AKHIR dalam file PDF ini.
      2. Prioritaskan soal-soal studi kasus atau pemahaman konsep (C3-C4).
      3. Pastikan field 'explanation' mencantumkan dari Modul mana soal tersebut berasal (Contoh: "Berdasarkan Modul 3 KB 1, ...").
      4. Soal harus menantang setara Ujian Akhir Semester Universitas Terbuka.
      5. Pastikan output adalah valid JSON Array dengan panjang 45 item.
      
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
                        explanation: { type: Type.STRING }
                    },
                    required: ["id", "question", "options", "correct_index", "explanation"]
                }
            };
        }

        console.log("Generating content...");
        const response = await ai.models.generateContent(requestConfig);

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
    - Langsung tulis tanpa pembuka/sapaan
    - Bahasa formal tapi supportif
    - Maksimal 5 kalimat
    
    CONTOH OUTPUT:
    "Anda mengalami kesulitan pada konsep dasar sistem informasi dan NORA di Modul 1 dan 3. Sebaiknya fokus mempelajari kembali definisi fundamental dan aplikasi praktis dari kedua topik tersebut. Buat peta konsep untuk memahami hubungan antar topik. Kerjakan latihan mandiri di setiap Kegiatan Belajar. Alokasikan 2-3 jam khusus untuk mendalami materi yang masih lemah."
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
Mahasiswa sedang membaca ringkasan materi (Notes) atau Modul PDF.
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
Ambil peran sebagai "Mas Aldi". Kamu adalah alumnus Universitas Terbuka (UT) yang sangat ahli dalam menaklukkan Forum Diskusi Tuton. Kamu tahu persis apa yang dicari oleh Tutor saat menilai diskusi: argumen yang orisinal, landasan teori dari BMP (Modul), dan dukungan referensi eksternal yang valid.
Nama maba (mahasiswa baru) bimbinganmu adalah: "${userName}".

[MISI TUNGGAL: DISCUSSION ACE]
Misimu hanya satu: Membantu "${userName}" menyusun jawaban diskusi (Sesi 1-8) yang berkualitas tinggi, terstruktur, dan memiliki dasar referensi yang kuat.

[ALUR KERJA "RACIKAN DISKUSI"]
Setiap kali pengguna memberikan soal diskusi, kamu WAJIB mengikuti langkah-langkah ini sesuai input yang diberikan sistem:

1. Langkah Riset (Step 2 UI):
   - Lakukan Deep Search.
   - BERIKAN "Bahan Mentah" yang terdiri dari: Ringkasan Teori/Definisi, Contoh Kasus Nyata, dan Daftar Referensi Valid.
   - JANGAN berikan jawaban final di langkah ini. Fokus pada suplai data.

2. Langkah Finalisasi (Step 4 UI):
   - Gabungkan poin-poin mahasiswa dengan hasil risetmu.
   - Rangkai menjadi jawaban diskusi yang akademis dan mengalir.
   - Tambahkan Sitasi/Referensi APA Style di akhir.

[ATURAN ETIKA & INTEGRITAS]
- Anti-Copas: Selalu ingatkan "${userName}": "Bro/Sis ${userName}, ini bahan matengnya ya. Jangan lupa diparafrase (tulis ulang) pake bahasamu sendiri biar unik dan nilainya bagus."
- Objektif: Jika diskusi meminta pendapat, berikan dua sisi pandang agar pengguna bisa memilih.

[GAYA KOMUNIKASI]
- Singkat, padat, berisi.
- Gunakan bullet points agar mudah dibaca cepat.
- Nada bicara: Membantu, cerdas, tapi santai ("Bro", "Kak", "${userName}").
`;

// TAHAP 4: Chat AI Tutor
export const sendChatToTutor = async (history: ChatMessage[], newMessage: string, userName: string = "Mahasiswa", contextMaterial?: string): Promise<string> => {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: getTutorInstruction(userName),
        },
        history: [
            {
                role: 'user',
                parts: [{
                    text: `SYSTEM CONTEXT (Hidden):
                Berikut adalah materi yang sedang dibaca user (CONTEXT MATERIAL). 
                Gunakan ini sebagai referensi utama jawabanmu jika relevan.
                Jika user bertanya tentang hal yang ada di sini, jelaskan berdasarkan teks ini.
                
                --- MULAI CONTEXT MATERIAL ---
                ${contextMaterial ? contextMaterial.substring(0, 20000) : "Tidak ada materi spesifik yang sedang dibuka."}
                --- SELESAI CONTEXT MATERIAL ---` }]
            },
            {
                role: 'model',
                parts: [{ text: `Dimengerti. Saya siap menjawab pertanyaan ${userName} berdasarkan konteks materi tersebut dengan gaya dosen pembimbing yang ramah.` }]
            },
            // Map history to API format
            ...history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }))
        ]
    });

    try {
        const response = await chat.sendMessage({ message: newMessage });
        return response.text || "";
    } catch (error) {
        console.error("Chat Error:", error);
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
       - Ringkasan Sintesis Teori/Definisi (Penting!).
       - Contoh Kasus Nyata (Jika relevan).
       - 3-5 Sumber Referensi Valid (APA Style).
    
    Ingat: JANGAN kasih jawaban final dulu. Kita kasih bahan biar ${userName} mikir dikit.
    Gaya bahasa: Santai, cerdas, mentor.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
                model: 'gemini-2.5-flash',
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

        Ide/Poin dari ${userName}:
        "${userPoints}"

        [TUGAS MAS ALDI]
        Sekarang waktunya 'masak' jawaban final buat ${userName}!
        1. Gabungkan poin-poin ${userName} di atas dengan data riset kita.
        2. Rangkai jadi jawaban diskusi yang flow-nya enak, akademis, dan 'daging'.
        3. Pastikan sitasi/referensi (APA Style) tercantum di bawah.
        4. Tambahkan catatan kaki/disclaimer khas Mas Aldi: "Ini bahan matengnya ya. Jangan lupa diparafrase biar unik!"
        
        Gaya bahasa jawaban: Formal Akademis (untuk diposting).
        Gaya bahasa komentar: Santai (untuk user).
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: getDiscussionPartnerInstruction(userName)
            }
        });

        return response.text || "Waduh, gagal ngeracik jawaban. Coba lagi, Bro.";
    } catch (error) {
        console.error("Discussion Finalize Error:", error);
        throw new Error("Mas Aldi gagal menyusun jawaban akhir.");
    }
};
