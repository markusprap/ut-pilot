import '../api/src/config/env.js';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { uploadFileToGemini, generateContentFromUri, analyzeExamPerformance } from '../api/src/services/geminiService.js';
import type { GenerateContentRequest, AnalyzeExamRequest } from '../api/src/types/index.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'UT-Pilot Backend Running' });
});

// Upload PDF
app.post('/api/gemini/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = await uploadFileToGemini(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate content
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { fileUri, mimeType, mode, chapterNumber, subType }: GenerateContentRequest = req.body;
    if (!fileUri || !mimeType || !mode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await generateContentFromUri(fileUri, mimeType, mode, chapterNumber, subType);
    res.json({ content: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze exam
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { questions, userAnswers }: AnalyzeExamRequest = req.body;
    if (!questions || !userAnswers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await analyzeExamPerformance(questions, userAnswers);
    res.json({ analysis: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
