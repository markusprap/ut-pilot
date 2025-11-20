# UT-Pilot - AI Study Assistant for Universitas Terbuka

## Project Overview

Full-stack monorepo application helping Indonesian university students study from PDF modules using Google Gemini AI. Users upload PDF course materials, and the AI generates smart notes, practice quizzes, and full exam simulations.

**Target Users**: Students at Universitas Terbuka (Indonesian distance learning university)  
**Language**: All UI and AI responses are in Indonesian (Bahasa Indonesia)

## Architecture

### Monorepo Structure
```
ut-pilot/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── services/  # API service layer
│   │   └── types/
│   └── package.json
├── backend/           # Express + TypeScript
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Gemini AI integration
│   │   └── types/
│   └── package.json
└── package.json       # Root workspace manager
```

### Frontend Architecture (React)
- **No external state library** - uses React `useState` + `useEffect` with localStorage persistence
- **Single source of truth**: `courses` array in `App.tsx` contains all application data
- **Persistence**: All course data auto-saves to `localStorage` under key `ut-pilot-courses`
- **Critical pattern**: Always call `saveToStorage(newCourses)` immediately after mutating course data
- **API Layer**: `services/apiService.ts` communicates with backend via REST API

### Backend Architecture (Express)
- **RESTful API** serving three main endpoints: `/upload`, `/generate`, `/analyze`
- **Gemini Integration**: `services/geminiService.ts` handles all Google AI API calls
- **File Handling**: Uses `multer` for PDF upload (max 50MB), converts to Buffer for Gemini
- **CORS**: Configured for `localhost:3000` frontend origin

### Data Flow
```
App.tsx (Root State)
  ├─> courses: Course[] (persisted to localStorage)
  ├─> activeCourse: Course | null (currently selected)
  └─> mode: AppMode (navigation state machine)

Course.modules: Record<number, ModuleData>
  ├─> notes: string (cached AI-generated markdown)
  └─> quiz: QuizQuestion[] (20-25 question pool, 5 shown at a time)

Course.examHistory: ExamHistoryItem[]
  └─> stores exam results with AI performance analysis
```

### Navigation State Machine (AppMode enum)
- `LANDING` → `HOME` (course grid) → `COURSE_DASHBOARD` → `STUDY_SESSION` or `EXAM_SIMULATION`
- Each mode renders completely different UI in `App.tsx` main element
- Use `setMode()` to navigate; `handleBackToHome()` resets to HOME

## Google Gemini AI Integration (Backend Only)

### API Endpoints
1. **POST `/api/gemini/upload`** - Accepts PDF file (multipart), returns `{ fileUri, mimeType }`
2. **POST `/api/gemini/generate`** - Generates notes/quiz from fileUri, returns `{ content }`
3. **POST `/api/gemini/analyze`** - Analyzes exam results, returns `{ analysis }`

### Three-Phase Process (Backend)
1. **Upload** (`uploadFileToGemini`): Uploads PDF Buffer to Google File API, polls until status = `ACTIVE`
2. **Generate** (`generateContentFromUri`): Sends file URI + prompt to `gemini-2.5-flash` model
3. **Analyze** (`analyzeExamPerformance`): Post-exam AI feedback on wrong answers

### Key Implementation Details
- **Model**: `gemini-2.5-flash` (hardcoded in `backend/src/services/geminiService.ts`)
- **API Key**: Read from `process.env.GEMINI_API_KEY` in `backend/.env`
- **System Instruction**: Enforces formal Indonesian language, no greetings, academic tone
- **Safety Settings**: All set to `BLOCK_NONE` to prevent educational content false positives
- **JSON Mode**: Quiz/exam generation uses structured output with schema validation
- **File Polling**: Exponential backoff (5s intervals, max 60 attempts) waiting for PDF processing

### Prompt Engineering Patterns
- **Study Notes**: Emphasizes Markdown structure with H3 for "Kegiatan Belajar" (KB) subsections
- **Quiz Generation**: Prioritizes extracting questions from "Tes Formatif" sections in PDFs, generates 20-25 questions for pooling
- **Exam Simulation**: 45 questions sampled evenly across all modules with C3-C4 cognitive level focus

## Component Responsibilities

### Frontend (`frontend/src/`)

**`App.tsx`** - Root state container and router
- Manages `courses`, `activeCourse`, `mode`, `examQuestions`
- Callbacks: `handleUpdateCourseModule()`, `handleExamComplete()`, `handleCreateCourse()`
- **Pattern**: All course mutations go through `setCourses()` + `saveToStorage()`
- Calls `apiService.ts` for all backend communication

**`StudySession.tsx`** - Chapter navigation and study modes
- Dual mode: Notes view (markdown) + Quiz view (5 random questions from pool)
- **Caching strategy**: Checks `course.modules[chapter]` first, only fetches from API if missing
- **Quiz pooling**: Stores 20-25 questions, displays 5 random ones per attempt

**`QuizView.tsx`** - Quiz and exam interface
- Reusable for both practice quiz and exam simulation (45 questions)
- **Props distinction**: `isExamMode={true}` enables 90-minute timer, navigation grid
- Custom confirmation modal for exam submission (no browser alert)
- AI analysis displayed at bottom after detailed review

**`services/apiService.ts`** - Backend API client
- Three functions: `uploadFileToGemini`, `generateContentFromUri`, `analyzeExamPerformance`
- All functions use `fetch()` to communicate with backend REST API
- Error handling with user-friendly Indonesian messages

### Backend (`backend/src/`)

**`server.ts`** - Express application entry point
- CORS configuration for frontend origin
- Routes mounted at `/api/gemini`
- Health check endpoint at `/api/health`
- Global error handler middleware

**`routes/gemini.ts`** - API endpoint handlers
- `/upload` - Multer middleware for file handling
- `/generate` - Content generation dispatcher
- `/analyze` - Exam analysis endpoint

**`services/geminiService.ts`** - Google Gemini integration
- Adapted for Node.js (Buffer instead of File)
- Three exported functions matching frontend contract
- File polling logic and retry mechanisms
- Response cleaning and JSON parsing

## Development Workflow

### Environment Setup
```bash
# Root directory
npm install  # Installs all workspace dependencies

# Configure environment variables
# backend/.env
GEMINI_API_KEY=your_api_key_here
PORT=5000
FRONTEND_URL=http://localhost:3000

# frontend/.env (optional)
VITE_API_URL=http://localhost:5000
```

### Development Commands
```bash
# Run both frontend and backend concurrently
npm run dev

# Run individually
npm run dev:frontend  # Vite on localhost:3000
npm run dev:backend   # Express on localhost:5000

# Build for production
npm run build         # Builds both workspaces
npm run build:frontend
npm run build:backend

# Start production server
npm start             # Runs backend only (serve frontend build separately)
```

### Key Dependencies
**Frontend:**
- `react` + `react-dom` - UI framework
- `react-markdown` - Renders AI-generated notes
- `lucide-react` - Icon library
- `vite` - Build tool with dev server + proxy

**Backend:**
- `express` - Web server framework
- `@google/genai` - Google Gemini SDK
- `multer` - File upload handling
- `cors` - Cross-origin request handling
- `tsx` - TypeScript execution for dev

## Conventions & Patterns

### TypeScript
- All types centralized in `types.ts`
- Enums preferred over string unions (e.g., `AppMode`)
- Interface naming: `Course`, `QuizQuestion`, `ModuleData` (no I-prefix)

### Styling
- **Tailwind CSS** inline classes (no separate CSS files)
- Color scheme: Blue primary (`blue-600`), slate grays, red for errors
- Design system: Rounded-2xl cards, shadow-sm, hover:-translate-y-1 lift effects

### Error Handling
- User-facing errors stored in `error` state (shown as fixed toast at top)
- API errors prefixed with context: "Gagal upload:", "Gagal memuat catatan:"
- Console.error for debugging, user sees simplified Indonesian message

### Indonesian Language Rules
- All UI text, prompts, and AI responses in formal Indonesian
- Key terms: "Modul" (module), "Kegiatan Belajar" (KB/learning activity), "Tes Formatif" (formative test)
- AI enforced not to use greetings or filler phrases via system instruction

## Common Tasks

### Adding a New Mode
1. Add enum value to `AppMode` in `types.ts`
2. Create conditional render block in `App.tsx` main element
3. Update navigation handlers (e.g., `handleBackToHome()`)

### Modifying AI Prompts
- Edit `SYSTEM_INSTRUCTION` or mode-specific prompts in `geminiService.ts`
- Test with real PDFs - prompts are highly tuned for Indonesian academic content structure

### Changing Quiz Pool Size
- Modify `QUIZ` prompt to request different count (currently 20-25)
- Update `getRandomQuestions()` count parameter (currently 5)

### Debugging AI Issues
- Check browser console for `generateContentFromUri` logs
- Safety filter blocks logged as "Empty AI response"
- PDF size limit: ~10MB typical, controlled by Google API

## External Dependencies

- **Google AI File API**: Temporary file storage (files auto-expire after processing)
- **LocalStorage**: Frontend-only persistence (no database)
- **Environment Variables**:
  - Backend: `GEMINI_API_KEY`, `PORT`, `FRONTEND_URL` in `backend/.env`
  - Frontend: Optional `VITE_API_URL` in `frontend/.env`
- **Vite Proxy**: Dev server proxies `/api/*` requests to `localhost:5000`

## Testing Notes

- No automated tests present
- Manual testing checklist:
  1. Upload PDF → check file polling completes
  2. Generate notes → verify markdown rendering
  3. Start quiz → confirm 5 random questions from pool
  4. Exam mode → test timer countdown and force-finish
  5. Browser refresh → verify localStorage persistence
