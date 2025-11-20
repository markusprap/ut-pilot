# Deployment Guide - Vercel

## Overview

UT-Pilot requires two separate Vercel deployments:
1. Frontend (React + Vite)
2. Backend (Express API)

## Prerequisites

- Vercel account (free tier works)
- Vercel CLI installed: `npm i -g vercel`
- Google Gemini API key

## Step 1: Deploy Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. Login to Vercel (if not already):
```bash
vercel login
```

3. Deploy backend:
```bash
vercel --prod
```

4. Follow prompts:
   - Set up and deploy? Yes
   - Which scope? Your account
   - Link to existing project? No
   - Project name? `ut-pilot-backend` (or your choice)
   - Directory? `./`
   - Override settings? No

5. Note the deployed URL (e.g., `https://ut-pilot-backend.vercel.app`)

6. Add environment variables in Vercel dashboard:
   - Go to project settings
   - Navigate to "Environment Variables"
   - Add:
     - `GEMINI_API_KEY`: Your Google Gemini API key
     - `PORT`: 4000
     - `FRONTEND_URL`: (will add after frontend deploy)

## Step 2: Deploy Frontend

1. Navigate to frontend directory:
```bash
cd ../frontend
```

2. Update `vercel.json` with backend URL:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://ut-pilot-backend.vercel.app/api/:path*"
    }
  ]
}
```

3. Deploy frontend:
```bash
vercel --prod
```

4. Follow similar prompts as backend

5. Note the deployed URL (e.g., `https://ut-pilot.vercel.app`)

## Step 3: Update Backend CORS

1. Go to backend project in Vercel dashboard
2. Update `FRONTEND_URL` environment variable to your deployed frontend URL
3. Redeploy backend:
```bash
cd ../backend
vercel --prod
```

## Step 4: Verify Deployment

1. Visit your frontend URL
2. Test upload functionality
3. Check browser console for any CORS errors
4. Verify API calls are reaching backend

## Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL` in backend matches exact frontend URL (with https://)
- Check Vercel logs for backend: `vercel logs`

### API Key Not Working
- Verify environment variable is set in Vercel dashboard
- Check variable name is exactly `GEMINI_API_KEY`
- Redeploy after adding variables

### 404 on API Routes
- Ensure `vercel.json` routes are configured correctly
- Check backend logs: `vercel logs --follow`

### Build Failures
- Run `npm run build` locally first to catch errors
- Check Node.js version compatibility (18+)
- Review build logs in Vercel dashboard

## Alternative: Monorepo Deployment

For single deployment (not recommended but possible):

1. Create root `vercel.json`:
```json
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "frontend/dist"
      }
    },
    {
      "src": "backend/src/server.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/src/server.ts"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/dist/$1"
    }
  ]
}
```

2. Deploy from root:
```bash
vercel --prod
```

Note: This approach may have limitations with module resolution.

## Environment Variables Summary

### Backend (Vercel Dashboard)
```
GEMINI_API_KEY=<your-api-key>
PORT=4000
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (No variables needed)
API URL is handled by `vercel.json` rewrites.

## Post-Deployment

1. Test all features:
   - Course creation
   - PDF upload
   - Note generation
   - Quiz generation
   - Exam simulation
   - History review

2. Monitor usage:
   - Vercel analytics dashboard
   - Gemini API quota usage
   - Function execution logs

3. Set up custom domain (optional):
   - Add domain in Vercel project settings
   - Update DNS records
   - Update `FRONTEND_URL` in backend

## Cost Considerations

### Vercel Free Tier Limits
- 100 GB bandwidth/month
- 100 hours serverless function execution
- 6000 builds/month

### Gemini API Free Tier
- 15 requests per minute
- 1 million tokens per minute
- 1500 requests per day

For production use with multiple users, consider:
- Vercel Pro plan ($20/month)
- Gemini API paid tier
- Implementing rate limiting
- Adding user authentication

## Support

For deployment issues:
- Check Vercel docs: https://vercel.com/docs
- Review Gemini API docs: https://ai.google.dev/docs
- Open issue on GitHub: https://github.com/markusprap/ut-pilot/issues
