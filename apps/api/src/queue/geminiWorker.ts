import { Worker, Job } from 'bullmq';
import { connection } from './connection.js';
import { GEMINI_QUEUE_NAME } from './geminiQueue.js';
import { generateContentFromUri } from '../services/geminiService.js';
import { GenerateContentRequest } from '../types/index.js';

export const setupWorker = () => {
    const worker = new Worker<GenerateContentRequest>(
        GEMINI_QUEUE_NAME,
        async (job: Job<GenerateContentRequest>) => {
            console.log(`Processing job ${job.id}: ${job.data.subType} for ${job.data.fileUri}`);

            const { fileUri, mimeType, mode, chapterNumber, subType } = job.data;

            const result = await generateContentFromUri(
                fileUri,
                mimeType,
                mode,
                chapterNumber,
                subType
            );

            return result;
        },
        {
            connection,
            concurrency: 5, // Process 5 jobs concurrently
        }
    );

    worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed!`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} failed: ${err.message}`);
    });

    console.log('🚀 Gemini Worker started!');
    return worker;
};
