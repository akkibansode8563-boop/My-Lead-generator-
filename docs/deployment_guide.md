# Production Deployment Guide: Vercel + Backend Architecture

## Overview
This guide documents the enterprise deployment strategy for the **National IT Hardware Customer Intelligence Platform**.

## Architecture Choice: Hybrid Vercel + Render / Railway

- **Frontend**: Hosted on **Vercel** (Global Edge CDN, automatic HTTPS, zero server maintenance).
- **Backend Worker**: Hosted on **Render.com** / **Railway.app** / **DigitalOcean VPS** (Persistent Node.js process supporting Playwright Chromium and long-running scans).

---

## Step 1: Deploying Backend to Render.com (Free Tier)

1. Create a free account on [Render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Configure service settings:
   - **Name**: `it-hardware-intelligence-backend`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx playwright install chromium --with-deps`
   - **Start Command**: `npm start`
5. Add Environment Variables in Render Dashboard:
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase Service Key
   - `PORT` = `3000`
6. Click **Create Web Service**. Note your backend URL (e.g. `https://it-hardware-backend.onrender.com`).

---

## Step 2: Deploying Frontend to Vercel

1. Create a free account on [Vercel.com](https://vercel.com).
2. Click **Add New** → **Project**.
3. Import your GitHub repository.
4. Configure project:
   - **Framework Preset**: `Other` / `Static HTML`
   - **Root Directory**: `./`
5. Deploy! Vercel will give you a production domain (e.g. `https://it-hardware-platform.vercel.app`).

---

## Step 3: Connecting Frontend to Render Backend

In `js/apify.js`, update the API endpoint fallback:

```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://your-backend.onrender.com';
```
