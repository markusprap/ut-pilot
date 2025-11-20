# UT-Pilot

AI-powered study assistant for Universitas Terbuka students. Upload your PDF course modules and get smart notes, practice quizzes, and full exam simulations powered by Google Gemini AI.

## Overview

UT-Pilot is a full-stack web application designed specifically for Indonesian distance learning students at Universitas Terbuka. The app processes PDF course materials and generates structured study resources including summarized notes, practice questions, and comprehensive exam simulations with AI-powered performance analysis.

## Key Features

### Smart Notes Generation
- Automatically extracts and summarizes PDF module content
- Structured markdown format with clear hierarchies
- Focuses on learning activities (Kegiatan Belajar) organization
- Optimized for quick review and comprehension

### Practice Quiz System
- Generates 20-25 questions per module for question pooling
- Displays 5 random questions per practice session
- Instant feedback with detailed explanations
- Adapts questions from "Tes Formatif" sections in source PDFs

### Exam Simulation
- Full 45-question exam covering all modules
- 90-minute countdown timer with auto-submit
- Question navigation grid for easy movement between questions
- Saves complete exam history with review capability

### AI Performance Analysis
- Post-exam analysis identifying weak areas
- Specific study recommendations based on mistake patterns
- Concise 5-sentence feedback format
- Targets learning gaps across modules

### Course Management
- Multiple course support with dedicated dashboards
- Module-by-module content organization
- Exam history tracking with detailed review
- LocalStorage persistence for offline access

## Tech Stack

### Frontend
- React 19.2.0 with TypeScript
- Vite for fast development and optimized builds
- Tailwind CSS (CDN) for styling
- Lucide React for iconography
- React Markdown for content rendering

### Backend
- Node.js with Express 4.18.2
- TypeScript for type safety
- Google Gemini 2.5 Flash API for AI generation
- Multer for file upload handling
- CORS enabled for cross-origin requests

### Infrastructure
- NPM workspaces for monorepo management
- LocalStorage for client-side persistence
- RESTful API architecture

## Project Structure

```
ut-pilot/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   └── types.ts       # TypeScript interfaces
│   └── package.json
├── backend/               # Express backend server
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Gemini AI integration
│   │   ├── config/       # Environment configuration
│   │   └── types/        # Shared type definitions
│   └── package.json
└── package.json          # Root workspace configuration
```

## Installation

### Prerequisites
- Node.js 18+ and npm
- Google Gemini API key (get from [Google AI Studio](https://makersuite.google.com/app/apikey))

### Setup

1. Clone the repository:
```bash
git clone git@github.com:markusprap/ut-pilot.git
cd ut-pilot
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:

Create `backend/.env`:
```env
GEMINI_API_KEY=your_api_key_here
PORT=4000
FRONTEND_URL=http://localhost:3000
```

4. Start development servers:
```bash
npm run dev
```

This runs both frontend (localhost:3000) and backend (localhost:4000) concurrently.

### Individual Commands

```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend

# Build for production
npm run build
```

## API Endpoints

### POST /api/gemini/upload
Upload PDF file to Google File API.

**Request:** multipart/form-data with `file` field  
**Response:** `{ fileUri: string, mimeType: string }`

### POST /api/gemini/generate
Generate content from uploaded PDF.

**Body:**
```json
{
  "fileUri": "string",
  "mimeType": "string",
  "mode": "STUDY_SESSION | EXAM_SIMULATION",
  "chapterNumber": 1,
  "subType": "NOTES | QUIZ"
}
```

**Response:** String (notes) or QuizQuestion[] (quiz/exam)

### POST /api/gemini/analyze
Analyze exam performance and provide recommendations.

**Body:**
```json
{
  "questions": QuizQuestion[],
  "userAnswers": number[]
}
```

**Response:** `{ analysis: string }`

## Usage Guide

### Creating a Course

1. Click "Tambah Mata Kuliah Baru" on home screen
2. Enter course code and title
3. Upload PDF module (max 50MB)
4. Wait for processing (file must reach ACTIVE state)

### Studying

1. Select course from dashboard
2. Choose module number
3. Click "Mulai Belajar" for notes + practice quiz
4. Switch between notes and quiz views as needed

### Taking Exams

1. From course dashboard, click "Simulasi Ujian"
2. Wait for 45 questions to generate (fresh each time)
3. Answer questions with 90-minute timer
4. Review detailed results and AI analysis
5. Access exam history for future review

### Reviewing History

1. Navigate to course dashboard
2. Scroll to "Riwayat Simulasi UAS"
3. Click any exam entry to view full review
4. See all questions, answers, and explanations

## Data Storage

All data is stored in browser LocalStorage under the key `ut-pilot-courses`. This includes:

- Course metadata and file references
- Generated notes and quiz questions per module
- Complete exam history with questions and user answers
- AI analysis summaries

Data persists across sessions but is device-specific.

## Development Notes

### State Management
No external state library is used. Application state is managed through React hooks (useState, useEffect) with localStorage persistence handled explicitly via helper functions.

### Mode System
The app uses an enum-based mode system (`AppMode`) for navigation:
- LANDING: Marketing page
- HOME: Course grid
- COURSE_DASHBOARD: Module and exam selection
- STUDY_SESSION: Notes and practice quiz
- EXAM_SIMULATION: Full exam mode
- EXAM_REVIEW: Historical exam review

### Component Architecture

**QuizView**: Practice quiz component (5 questions, linear flow, instant feedback)

**ExamView**: Full exam component (45 questions, timer, navigation, AI analysis)

**ExamReview**: Read-only historical exam results viewer

**StudySession**: Module learning with notes/quiz toggle

## Deployment

### Vercel (Recommended)

The application is configured for Vercel deployment with separate frontend and backend deployments.

**Frontend Deployment:**
```bash
cd frontend
vercel --prod
```

**Backend Deployment:**
```bash
cd backend
vercel --prod
```

Environment variables must be configured in Vercel dashboard:
- `GEMINI_API_KEY`
- `FRONTEND_URL` (set to deployed frontend URL)

Update `frontend/vite.config.ts` proxy target to point to deployed backend URL.

### Alternative: Single Server

For traditional hosting, build both workspaces and serve:

```bash
npm run build
cd backend
npm start
```

Serve `frontend/dist` as static files from Express or nginx.

## Environment Variables

### Backend
- `GEMINI_API_KEY`: Google Gemini API key (required)
- `PORT`: Server port (default: 4000)
- `FRONTEND_URL`: CORS allowed origin (default: http://localhost:3000)

### Frontend
- `VITE_API_URL`: Backend API URL (optional, uses proxy in dev)

## Known Limitations

1. PDF processing depends on Google File API availability
2. Maximum file size: 50MB (multer limitation)
3. Question generation quality depends on PDF content structure
4. LocalStorage has ~5-10MB limit per domain
5. No user authentication (single-user application)

## Troubleshooting

### Backend not loading API key
Ensure `.env` file is in `backend/` directory and contains valid `GEMINI_API_KEY`.

### Port conflicts
Change `PORT` in `backend/.env` and update proxy in `frontend/vite.config.ts`.

### PDF upload fails
Check file size (<50MB) and ensure PDF is text-based (not scanned images).

### Questions not generating
Verify Gemini API key is valid and has quota remaining. Check console for detailed error messages.

## Contributing

This is a personal project for Universitas Terbuka students. Contributions are welcome via pull requests.

## License

MIT License - See LICENSE file for details.

## Author

Built by Markus Prap for the Universitas Terbuka student community.

## Acknowledgments

- Google Gemini API for AI-powered content generation
- Universitas Terbuka for the inspiration and use case
- React and Vite teams for excellent developer experience
