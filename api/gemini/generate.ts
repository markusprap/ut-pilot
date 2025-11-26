import { generateContentFromUri } from '../../api/src/services/geminiService.js';
import type { GenerateContentRequest } from '../../api/src/types/index.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileUri, mimeType, mode, chapterNumber, subType }: GenerateContentRequest = req.body;
    
    if (!fileUri || !mimeType || !mode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await generateContentFromUri(fileUri, mimeType, mode, chapterNumber, subType);
    return res.status(200).json({ content: result });
  } catch (error: any) {
    console.error('Generate error:', error);
    return res.status(500).json({ error: error.message || 'Generation failed' });
  }
}
