import './config/env.js'; // Load env FIRST
import express from 'express';
import cors from 'cors';
import geminiRoutes from './routes/gemini.js';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Vercel)
const PORT = process.env.PORT || 4001;

// Security Middleware
app.use(helmet());

// Rate Limiting
// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter as unknown as express.RequestHandler);

// Specific Limiter for AI Generation (Stricter to save quota)
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 AI requests per windowMs
  message: { error: 'AI Rate Limit Exceeded. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/gemini', aiLimiter as unknown as express.RequestHandler);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Limit JSON body size

// Routes
app.use('/api/gemini', geminiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'UT-Pilot Backend Running' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Local development server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);

    // Start Worker
    import('./queue/geminiWorker.js').then(({ setupWorker }) => {
      setupWorker();
    }).catch(err => console.error('Failed to start worker:', err));
  });
}

// Export for Vercel serverless
export default app;
