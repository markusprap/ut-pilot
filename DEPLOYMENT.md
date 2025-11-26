# Deployment Guide - UT-Pilot di Vercel

## Overview

UT-Pilot menggunakan **monorepo serverless architecture**:
- **Frontend**: React + Vite → Static files di `/frontend/dist`
- **Backend**: Express + TypeScript → Serverless functions di `/api/*`
- **Single Deployment**: Satu project Vercel untuk keseluruhan aplikasi

## Prerequisites

1. **Akun Vercel**: Daftar di [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally
   ```bash
   npm install -g vercel
   ```
3. **Login Vercel CLI**:
   ```bash
   vercel login
   ```
4. **Repository GitHub**: Pastikan code sudah di-push ke GitHub
5. **Google Gemini API Key**: Dapatkan dari [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## Deployment Steps

### 1. Install Dependencies

Dari root directory project:

```bash
npm install
```

### 2. Build Frontend (Optional Test)

```bash
npm run build
```

Ini akan:
- Build frontend Vite ke `frontend/dist/`
- Build backend TypeScript ke `api/dist/`

### 3. Deploy ke Vercel

Dari **root directory** (bukan folder frontend atau api):

```bash
vercel --prod
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Pilih account Anda
- **Link to existing project?** → No
- **Project name?** → `ut-pilot` (atau nama lain)
- **In which directory is your code located?** → `./` (root)

Vercel akan:
1. Detect `vercel.json` configuration
2. Build frontend dengan `npm run vercel-build`
3. Build backend API sebagai serverless functions
4. Deploy static files dan API routes

### 4. Configure Environment Variables

Setelah deployment selesai, buka Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Pilih project **ut-pilot**
3. Settings → Environment Variables
4. Tambahkan variable berikut:

| Key | Value | Environment |
|-----|-------|-------------|
| `GEMINI_API_KEY` | `your-google-gemini-api-key` | Production |
| `NODE_ENV` | `production` | Production |
| `PORT` | `4000` | Production (optional) |
| `FRONTEND_URL` | `https://ut-pilot.vercel.app` | Production |

**IMPORTANT**: Ganti `https://ut-pilot.vercel.app` dengan URL deployment Anda yang sebenarnya.

### 5. Redeploy untuk Apply Environment Variables

Setelah menambahkan environment variables:

```bash
vercel --prod
```

Atau dari Vercel Dashboard → Deployments → Redeploy

---

## Verification

### Test Backend API

```bash
curl https://your-project.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "UT-Pilot Backend Running"
}
```

### Test Frontend

1. Buka: `https://your-project.vercel.app`
2. Klik "Mulai Sekarang"
3. Buat course baru
4. Upload PDF modul
5. Verifikasi:
   - Notes generation berfungsi
   - Quiz generation berfungsi
   - Exam simulation berfungsi
   - AI analysis muncul setelah exam

---

## Architecture Explanation

### Vercel Configuration (`vercel.json`)

```json
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build"
    },
    {
      "src": "api/src/server.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/src/server.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/dist/$1"
    }
  ]
}
```

**Routing Logic:**
1. Request ke `/api/*` → Diarahkan ke serverless function (Express backend)
2. Request ke `/` atau `/*` → Served dari `frontend/dist/` (static files)

**Benefits:**
- Single URL untuk frontend dan backend
- No CORS issues (same-origin)
- Automatic HTTPS
- Global CDN untuk static files
- Serverless auto-scaling untuk API

### Folder Structure

```
ut-pilot/
├── frontend/           # React app
│   ├── src/
│   └── dist/          # Build output (served as static)
├── api/               # Express backend
│   ├── src/
│   │   └── server.ts  # Serverless function entry point
│   └── dist/          # TypeScript build output
├── vercel.json        # Deployment config
└── package.json       # Root workspace
```

---

## Troubleshooting

### Build Errors

**Problem**: `vercel-build` script fails

**Solution**: Run locally first to debug:
```bash
npm run build
```

Check for TypeScript errors or missing dependencies.

---

### API Routes Not Working

**Problem**: 404 error on `/api/gemini/upload`

**Check:**
1. Vercel logs: `vercel logs --prod`
2. Pastikan `api/src/server.ts` exports handler untuk Vercel:
   ```typescript
   export default app; // Add this at the end of server.ts
   ```

---

### Environment Variables Not Working

**Problem**: `GEMINI_API_KEY` undefined

**Solution:**
1. Check Vercel Dashboard → Settings → Environment Variables
2. Pastikan variable tersimpan untuk **Production** environment
3. Redeploy setelah menambahkan variables

---

### CORS Errors

**Problem**: Frontend tidak bisa call API

**Solution:**
Harusnya tidak ada masalah CORS karena satu domain. Jika masih error:

1. Check `api/src/server.ts` CORS config:
   ```typescript
   app.use(cors({
     origin: process.env.FRONTEND_URL || '*',
     credentials: true
   }));
   ```

2. Update `FRONTEND_URL` environment variable dengan URL production yang benar

---

### PDF Upload Fails

**Problem**: "File too large" error

**Vercel Limits:**
- Free tier: 5MB request body
- Pro tier: 50MB request body

**Solution:**
- Upgrade ke Vercel Pro jika perlu upload PDF > 5MB
- Atau compress PDF sebelum upload

---

### Cold Start Delays

**Problem**: First API request lambat (5-10 detik)

**Explanation**: Serverless functions have "cold starts" setelah tidak digunakan beberapa menit.

**Solution:**
- Normal behavior untuk serverless
- Consider Vercel Pro untuk faster cold starts
- Atau implement "keep-alive" ping dari frontend

---

## Cost Considerations

**Vercel Free Tier:**
- Unlimited deployments
- 100GB bandwidth/month
- Serverless function executions: 100 GB-Hours
- Typically sufficient untuk project personal/demo

**Upgrade to Pro jika:**
- Traffic > 100GB/month
- Butuh upload PDF > 5MB
- Perlu faster cold starts
- Butuh team collaboration features

---

## Alternative: GitHub Integration

### Auto-Deploy on Git Push

1. Import project di Vercel Dashboard:
   - Klik "Add New" → "Project"
   - Import from GitHub: `markusprap/ut-pilot`
   - Root Directory: `./`
   - Framework Preset: Other

2. Configure build settings:
   - Build Command: `npm run vercel-build`
   - Output Directory: `frontend/dist`
   - Install Command: `npm install`

3. Set environment variables (sama seperti sebelumnya)

4. Setiap push ke `main` branch akan auto-deploy

**Benefit**: No need manual `vercel --prod`, otomatis deploy saat git push.

---

## Development vs Production

### Local Development

```bash
npm run dev
```

- Frontend: `localhost:3000`
- Backend: `localhost:4000`
- Vite proxy mengarahkan `/api/*` ke backend

### Production

- Single URL: `https://ut-pilot.vercel.app`
- Frontend: Static files dari CDN
- Backend: Serverless functions (`/api/*` routes)
- No proxy needed

---

## Support

Issues atau questions:
- GitHub Issues: https://github.com/markusprap/ut-pilot/issues
- Vercel Docs: https://vercel.com/docs
- Google Gemini API: https://ai.google.dev/docs
