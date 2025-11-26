export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return API key untuk client-side upload
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in environment');
    return res.status(500).json({ error: 'API key not configured' });
  }

  return res.status(200).json({ apiKey });
}
