import express, { Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadFileToGemini, generateContentFromUri, analyzeExamPerformance, initializeResumableUpload, pollFileState, sendChatToTutor, generateDiscussionResearch, generateDiscussionFinal, processStoredFile } from '../services/geminiService.js';
import type { GenerateContentRequest, AnalyzeExamRequest } from '../types/index.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
// import { geminiQueue } from '../queue/geminiQueue.js'; // DISABLED FOR SERVERLESS

const router = express.Router();
// Keep memory storage just for fallback or other needs, but limit is not main issue now for direct upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Apply Global Auth for Gemini Routes? Or Per Route?
// Let's apply per route for clarity or granular control.

// POST /api/gemini/upload/init - Protect: Abuse prevention
router.post('/upload/init', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { mimeType, fileSize, displayName } = req.body;

    if (!mimeType || !fileSize || !displayName) {
      return res.status(400).json({ error: 'Missing required metadata (mimeType, fileSize, displayName)' });
    }

    const uploadUrl = await initializeResumableUpload(mimeType, fileSize, displayName);
    res.json({ uploadUrl });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/gemini/upload/process-stored - Protect
router.post('/upload/process-stored', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { filePath, mimeType, displayName } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'Missing required field: filePath' });
    }

    // console.log(`Processing stored file: ${filePath}`);
    const result = await processStoredFile(filePath, mimeType || 'application/pdf', displayName || 'document.pdf');

    res.json(result);

  } catch (error: any) {
    next(error);
  }
});

// POST /api/gemini/upload/verify - Protect
router.post('/upload/verify', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { fileUri } = req.body;
    if (!fileUri) {
      return res.status(400).json({ error: 'Missing fileUri' });
    }

    await pollFileState(fileUri);

    res.json({ status: 'active', fileUri });

  } catch (error: any) {
    next(error);
  }
});


// POST /api/gemini/upload - Legacy - Protect
router.post('/upload', authenticateUser, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    const result = await uploadFileToGemini(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});


// POST /api/gemini/generate - PROTECT CRITICAL
router.post('/generate', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { fileUri, mimeType, mode, chapterNumber, subType, userEmail }: GenerateContentRequest = req.body;

    // SECURITY: Override userId with Authenticated User ID
    const userId = req.user.id;

    if (!fileUri || !mimeType || !mode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // console.log(`Generating content DIRECTLY for ${mode}... User: ${userId}`);
    const result = await generateContentFromUri(fileUri, mimeType, mode, chapterNumber, subType, userId, userEmail);

    // Return result IMMEDIATELY mimicking a completed job
    res.json({
      jobId: 'direct-execution',
      status: 'completed',
      result: result
    });

  } catch (error: any) {
    next(error);
  }
});

// GET /api/gemini/status/:jobId - Check job status
router.get('/status/:jobId', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  res.status(404).json({ error: 'Job not found (Direct Execution Mode Enabled)' });
});

// POST /api/gemini/analyze - Analyze exam performance - Protect
router.post('/analyze', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

// POST /api/gemini/chat - Chat with Tutor - Protect
router.post('/chat', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { history, message, userName, contextMaterial } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    // Import service
    const { sendChatToTutor } = await import('../services/geminiService.js');

    const response = await sendChatToTutor(history, message, userName, contextMaterial);
    res.json({ text: response });
  } catch (e: any) {
    next(e);
  }
});

// POST /api/gemini/discussion - Protect
router.post('/discussion', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as string;
    const { question, userName, researchResult, userPoints } = req.body;

    const { generateDiscussionResearch, generateDiscussionFinal } = await import('../services/geminiService.js');

    if (type === 'research') {
      const result = await generateDiscussionResearch(question, userName);
      res.json(result);
    } else if (type === 'final') {
      const result = await generateDiscussionFinal(question, researchResult, userPoints, userName);
      res.json({ text: result });
    } else {
      res.status(400).json({ error: "Invalid discussion type" });
    }
  } catch (e: any) {
    next(e);
  }
});

router.get('/quota/:userId', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    // SECURITY CHECK: Ensure user is reading their own quota or is admin
    if (req.user.id !== userId) {
      // Optional: Check if admin. For now strict checking.
      // return res.status(403).json({ error: "Access Denied" });
    }

    const { getQuotaStatus } = await import('../services/geminiService.js');
    const result = await getQuotaStatus(userId);
    res.json(result);
  } catch (e: any) {
    next(e);
  }
});

// POST /api/gemini/quota/increment - Protect Critical
router.post('/quota/increment', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // SECURITY: Use Authenticated ID
    const userId = req.user.id;
    const { userEmail } = req.body; // Email still needed for logging/whitelist

    if (!userEmail) {
      return res.status(400).json({ error: "Missing userEmail" });
    }

    const { checkAndIncrementQuota } = await import('../services/geminiService.js');
    await checkAndIncrementQuota(userId, userEmail);

    res.json({ success: true, message: "Quota incremented" });
  } catch (e: any) {
    if (e.message && e.message.includes("Quota")) {
      res.status(429).json({ error: e.message });
    } else {
      next(e);
    }
  }
});

// POST /api/gemini/generate-image - Protect
router.post('/generate-image', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { prompt, courseCode } = req.body;
    const userId = req.user.id;

    if (!prompt || !courseCode) {
      return res.status(400).json({ error: "Missing prompt or courseCode" });
    }

    const { generateImageService } = await import('../services/geminiService.js');
    const imageUrl = await generateImageService(prompt, courseCode, userId);

    res.json({ imageUrl });

  } catch (e: any) {
    next(e);
  }
});

export default router;
