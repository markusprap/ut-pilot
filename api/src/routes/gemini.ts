import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadFileToGemini, generateContentFromUri, analyzeExamPerformance } from '../services/geminiService.js';
import type { GenerateContentRequest, AnalyzeExamRequest } from '../types/index.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// POST /api/gemini/upload - Upload PDF file
router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await uploadFileToGemini(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

// POST /api/gemini/generate - Generate notes or quiz
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileUri, mimeType, mode, chapterNumber, subType }: GenerateContentRequest = req.body;

    if (!fileUri || !mimeType || !mode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await generateContentFromUri(fileUri, mimeType, mode, chapterNumber, subType);
    res.json({ content: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/gemini/analyze - Analyze exam performance
router.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { questions, userAnswers }: AnalyzeExamRequest = req.body;

    if (!questions || !userAnswers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const analysis = await analyzeExamPerformance(questions, userAnswers);
    res.json({ analysis });
  } catch (error: any) {
    next(error);
  }
});

export default router;
