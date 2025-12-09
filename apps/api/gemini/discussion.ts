import { generateDiscussionResearch, generateDiscussionFinal } from '../../api/src/services/geminiService.js';
import type { DiscussionResearchRequest, DiscussionFinalRequest } from '../../api/src/types/index.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { type } = req.query;

        if (type === 'research') {
            const { question, userName }: DiscussionResearchRequest = req.body;
            if (!question) return res.status(400).json({ error: 'Missing question' });

            const result = await generateDiscussionResearch(question, userName);
            return res.status(200).json(result);
        }

        if (type === 'final') {
            const { question, researchResult, userPoints, userName }: DiscussionFinalRequest = req.body;
            if (!question || !researchResult || !userPoints) return res.status(400).json({ error: 'Missing required fields' });

            const result = await generateDiscussionFinal(question, researchResult, userPoints, userName);
            return res.status(200).json({ text: result });
        }

        return res.status(400).json({ error: 'Invalid type query param. Use "research" or "final".' });

    } catch (error: any) {
        console.error('Discussion error:', error);
        return res.status(500).json({ error: error.message || 'Discussion failed' });
    }
}
