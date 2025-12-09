import { sendChatToTutor } from '../../api/src/services/geminiService.js';
import type { ChatRequest } from '../../api/src/types/index.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { history, message, userName, contextMaterial }: ChatRequest = req.body;

        if (!history || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const response = await sendChatToTutor(history, message, userName, contextMaterial);
        return res.status(200).json({ text: response });
    } catch (error: any) {
        console.error('Chat error:', error);
        return res.status(500).json({ error: error.message || 'Chat failed' });
    }
}
