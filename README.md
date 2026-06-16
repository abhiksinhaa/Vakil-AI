# Draftee

AI-powered legal draft generator for Indian lawyers. Describe a situation, get a professional court-ready draft in seconds.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- Tailwind CSS
- **Firebase** — Authentication (Email/Password + Google) & Cloud Firestore
- **Firebase Admin SDK** — server-side Pro activation & referral rewards (Next route handlers)
- Google Gemini (`gemini-2.5-flash`) via the `/api/gemini` route handler
- Razorpay for the Pro plan (`/api/razorpay/*`)
- Deploy on [Vercel](https://vercel.com)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Sign-in method**: enable **Email/Password** and **Google**.
3. **Firestore Database**: create a database (production mode).
4. **Project settings → General → Your apps**: add a Web app and copy the config values.
5. **Project settings → Service accounts → Generate new private key**: download the JSON (used by the server for Pro activation & referral rewards).

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web app config (API key, auth domain, project id, etc.) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | The service-account JSON, **minified onto one line** |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | optional, default `gemini-2.5-flash` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay dashboard (optional — Pro plan) |

> `NEXT_PUBLIC_*` values are exposed to the browser (safe for Firebase web config). Everything else stays server-only.

### 4. Deploy Firestore rules & indexes

The security rules and composite indexes live in `firestore.rules` / `firestore.indexes.json`.

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

(Or run the local emulators with `firebase emulators:start`.)

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

## Data model (Firestore)

| Collection | Doc id | Purpose |
| --- | --- | --- |
| `profiles` | uid | advocate details, theme, referral code |
| `subscriptions` | uid | plan, Pro expiry, usage counters |
| `drafts` | auto | saved generated drafts |
| `referrals` | referred uid | one referral per referred user |
| `referralCodes` | CODE | code → uid lookup |
| `payments` | auto | Razorpay payment records (server-written) |
| `feedback` / `waitlist` | auto | user submissions |

Sensitive writes — activating Pro after a verified payment and granting referral rewards — are performed **only** by the Admin SDK in server route handlers; clients cannot self-grant Pro (enforced by `firestore.rules`).

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel (framework auto-detected as **Next.js**).
2. In **Project Settings → Environment Variables**, add every variable from `.env.example`
   (the `NEXT_PUBLIC_FIREBASE_*` set, `FIREBASE_SERVICE_ACCOUNT_KEY`, `GEMINI_API_KEY`, and the Razorpay keys).
3. Deploy. The `/api/*` endpoints are served as Next.js route handlers automatically — no `vercel.json` needed.
4. Add your Vercel domain to **Firebase → Authentication → Settings → Authorized domains**.

---

*Draftee — Built for Indian Lawyers*
