# Draftee

AI-powered legal draft generator for Indian lawyers. Describe a situation, get a professional court-ready draft in seconds.

## Stack

- React + Vite
- Tailwind CSS
- Google Gemini (`gemini-2.5-flash` — `gemini-1.5-flash` is no longer on the API)
- Supabase Auth + PostgreSQL
- Deploy on [Vercel](https://vercel.com)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env` and fill in:

   - `VITE_GEMINI_API_KEY` — [Google AI Studio](https://aistudio.google.com/apikey) (local dev + optional client)
   - `GEMINI_API_KEY` — same key, **required on Vercel** for the `/api/gemini` serverless function
   - `VITE_SUPABASE_URL` — Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — Supabase anon key

3. **Supabase database**

   Run the SQL from the project spec in the Supabase SQL editor (drafts table + RLS).

4. **Run locally**

   ```bash
   npm run dev
   ```

5. **Build for production**

   ```bash
   npm run build
   ```

## Security note (important)

This MVP calls the Gemini API **directly from the browser**. That exposes your API key to anyone who inspects the client.

**Before a public launch**, move draft generation to a serverless backend (e.g. Vercel API route) and keep `GEMINI_API_KEY` server-side only.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. In Project Settings → Environment Variables, add:
   - `GEMINI_API_KEY` (your Google AI key — used by `/api/gemini`)
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - Optional: `VITE_GEMINI_MODEL` (default `gemini-2.5-flash`)
4. Deploy. Confirm the deployment shows **`api/gemini.cjs`** under Serverless Functions (λ).

**Note:** Plain Vite SPAs do not auto-deploy `/api` routes. This project uses an explicit `builds` entry in `vercel.json` so the Gemini proxy is included.

`vercel.json` includes SPA rewrites so client-side routing works.

---

*Draftee MVP — Built for Indian Lawyers*
