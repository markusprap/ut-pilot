# UT-Pilot - Asisten Belajar Mahasiswa UT

Aplikasi web untuk membantu mahasiswa Universitas Terbuka dalam belajar dengan fitur AI-powered.

## Struktur Project (Monorepo)

Project ini telah direfactor menjadi monorepo dengan struktur:

- `apps/web`: Frontend (React + Vite)
- `apps/api`: Backend (Express + Node.js)

## Fitur Utama

- 📚 **Study Session**: Upload PDF modul dan generate rangkuman otomatis
- 📝 **Quiz Generator**: Buat soal latihan dari modul
- 🎓 **Exam Simulation**: Simulasi ujian akhir semester
- 💬 **AI Tutor**: Chat dengan AI tutor untuk bertanya materi
- 🤝 **Discussion Partner**: Bantuan menyusun jawaban diskusi forum

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express + TypeScript
- **AI**: Google Gemini 2.5 Flash
- **Storage**: IndexedDB (client-side)

## Development

```bash
# Install dependencies (Root)
npm install

# Run development server (Runs both Frontend and Backend concurrently)
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`
Backend akan berjalan di `http://localhost:4001`

## Environment Variables

Pastikan file `.env` ada di `apps/api/.env` (untuk Backend) dan `apps/web/.env` (jika diperlukan Frontend).

Contoh `.env`:
```env
GEMINI_API_KEY=your_api_key_here
PORT=4001
FRONTEND_URL=http://localhost:3000
```

## Deployment

Project ini siap dideploy ke Vercel. Pastikan konfigurasi Root Directory di Vercel disesuaikan jika mendeploy secara terpisah, atau gunakan konfigurasi monorepo Vercel.

## License

MIT
