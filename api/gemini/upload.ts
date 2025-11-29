import { uploadFileToGemini } from '../../api/src/services/geminiService.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fileBase64, filename } = req.body;

        if (!fileBase64 || !filename) {
            return res.status(400).json({ error: 'Missing fileBase64 or filename' });
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(fileBase64, 'base64');

        const result = await uploadFileToGemini(buffer, filename);
        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Upload error:', error);
        return res.status(500).json({ error: error.message || 'Upload failed' });
    }
}
