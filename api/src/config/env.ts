import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths
const possiblePaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  '/home/markusprap/Pribadi/Project/ut-pilot/backend/.env'
];

let loaded = false;
for (const envPath of possiblePaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error && process.env.GEMINI_API_KEY) {
    console.log('✅ .env loaded from:', envPath);
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.error('❌ Failed to load .env from any path');
  console.log('Tried paths:', possiblePaths);
}

console.log('🔑 GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Present ✅' : 'Missing ❌');

export {};
