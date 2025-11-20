import '../../api/src/config/env.js';
import { analyzeExamPerformance } from '../../api/src/services/geminiService.js';
import type { AnalyzeExamRequest } from '../../api/src/types/index.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { questions, userAnswers }: AnalyzeExamRequest = req.body;
    
    if (!questions || !userAnswers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await analyzeExamPerformance(questions, userAnswers);
    return res.status(200).json({ analysis: result });
  } catch (error: any) {
    console.error('Analyze error:', error);
    return res.status(500).json({ error: error.message || 'Analysis failed' });
  }
}
