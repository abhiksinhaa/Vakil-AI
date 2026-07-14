# Draftee

AI-powered legal draft generator for Indian lawyers. Describe a situation, get a professional court-ready draft in seconds.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- Tailwind CSS
- **Supabase** — Authentication and database backend
- Google Gemini (`gemini-2.0-flash`) via the `/api/gemini` route handler
- Razorpay for the Pro plan (`/api/razorpay/*`)
- Deploy on [Vercel](https://vercel.com)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [app.supabase.com](https://app.supabase.com).
2. Enable **Authentication** with **Email/Password** and **Google** providers.
3. Create the necessary tables: `profiles`, `subscriptions`, `drafts`, `chat_sessions`, `referrals`, `feedback`, `waitlist`.
4. In **Project Settings → API**, copy the `URL` and `anon public` key.
5. In **Project Settings → API**, copy the **Service Role** key for server-only operations.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | optional, default `gemini-2.0-flash` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay dashboard (optional — Pro plan) |

> `NEXT_PUBLIC_*` values are exposed to the browser (safe for public Supabase config). Everything else stays server-only.

### 4. Configure Supabase database

Create the required tables and RLS policies in Supabase. Example RLS setup for `drafts`:

```sql
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see their own drafts" ON drafts;

CREATE POLICY "Users can only see their own drafts"
ON drafts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drafts"
ON drafts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable read access for all users"
ON drafts FOR SELECT
USING (true);
```

### 5. Run locally

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000). The `/api/*` route handlers run in the same Next.js dev server — no separate proxy needed.

### 6. Build for production

```bash
npm run build
npm start
```

## Data model (Supabase)

| Table | Primary key | Purpose |
| --- | --- | --- |
| `profiles` | `id` / `user_id` | advocate details, theme, referral code |
| `subscriptions` | `id` | plan, Pro expiry, usage counters |
| `drafts` | auto | saved generated drafts |
| `referrals` | `id` | referral entries |
| `payments` | auto | Razorpay payment records (server-written) |
| `feedback` / `waitlist` | auto | user submissions |

Sensitive writes — activating Pro after a verified payment and granting referral rewards — are performed **only** by the server route handlers; clients cannot self-grant Pro (enforced by Supabase RLS and server-side checks).

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel (framework auto-detected as **Next.js**).
2. In **Project Settings → Environment Variables**, add every variable from `.env.example`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and the Razorpay keys).
5. Deploy. The `/api/*` endpoints are served as Next.js route handlers automatically — no `vercel.json` needed.
6. Add your Vercel domain to your Supabase Authentication settings, if required.

---

*Draftee — Built for Indian Lawyers*
