# UT-Pilot - Asisten Belajar Mahasiswa UT

Aplikasi web untuk membantu mahasiswa Universitas Terbuka dalam belajar dengan fitur AI-powered.

## Fitur Utama

- 📚 **Study Session**: Upload PDF modul dan generate rangkuman otomatis
- 📝 **Quiz Generator**: Buat soal latihan dari modul
- 🎓 **Exam Simulation**: Simulasi ujian akhir semester
- 💬 **AI Tutor**: Chat dengan AI tutor untuk bertanya materi
- 🤝 **Discussion Partner**: Bantuan menyusun jawaban diskusi forum

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **AI**: Google Gemini 2.5 Flash
- **Storage**: IndexedDB (client-side)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env.local` file:

```env
GEMINI_API_KEY=your_api_key_here
```

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

Atau push ke GitHub dan connect dengan Vercel dashboard.

## License

MIT
