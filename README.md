# VakilAI

AI-powered legal draft generator for Indian lawyers. Describe a situation, get a professional court-ready draft in seconds.

## Stack

- React + Vite
- Tailwind CSS
- Anthropic Claude (`claude-sonnet-4-20250514`)
- Supabase Auth + PostgreSQL
- Deploy on [Vercel](https://vercel.com)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env` and fill in:

   - `VITE_ANTHROPIC_API_KEY` — [Anthropic Console](https://console.anthropic.com/)
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

This MVP calls the Anthropic API **directly from the browser** using `anthropic-dangerous-direct-browser-access`. That exposes your API key to anyone who inspects the client.

**Before a public launch**, move draft generation to a serverless backend (e.g. Vercel API route) and keep `ANTHROPIC_API_KEY` server-side only.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Add the same `VITE_*` environment variables in Project Settings → Environment Variables.
4. Deploy.

`vercel.json` includes SPA rewrites so client-side routing works.

---

*VakilAI MVP — Built for Indian Lawyers*
