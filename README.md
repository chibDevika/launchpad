# Launchpad

A calm, AI-powered job application tracker. Paste a job description, get an honest match score, ATS improvement suggestions, and a built-in assistant that writes cover letters and resume variants — all in one place.

## What it does

- **Match scoring** — paste a JD and get a scored breakdown of fit vs. gaps, grounded in your resume and extended profile
- **ATS suggestions** — exact before/after edits to improve your resume for each role, with priority and reasoning
- **AI assistant** — streaming chat per application for cover letters, talking points, salary guidance, and motivation answers
- **Extended profile** — five freeform questions (with voice input) that surface signal your resume doesn't capture; used across all AI generation
- **Application tracker** — kanban board to track stage, channels, notes, tags, and timeline across all applications

## Tech stack

| Layer           | Choice                                                              |
| --------------- | ------------------------------------------------------------------- |
| Framework       | Next.js 14 (App Router)                                             |
| Database + Auth | Supabase (Postgres + Google OAuth)                                  |
| AI              | Anthropic Claude (Sonnet for analysis/chat, Haiku for suggest-chat) |
| Voice input     | Sarvam STT (`saarika:v2.5`)                                         |
| Styling         | Tailwind CSS                                                        |
| Runtime         | Node.js / Docker                                                    |

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key
- A [Sarvam](https://sarvam.ai) API key (for voice input)
- Google OAuth credentials (for login)

### Setup

```bash
git clone https://github.com/chibDevika/launchpad.git
cd launchpad
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

### Environment variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Google OAuth (via Supabase)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Sarvam STT (voice input)
SARVAM_API_KEY=
```

### Database

Run the migrations in order against your Supabase project (SQL Editor or CLI):

```
supabase/migrations/001_init.sql
supabase/migrations/002_work_preference.sql
supabase/migrations/003_google_token.sql
supabase/migrations/004_resume_format.sql
supabase/migrations/005_v2_tracker.sql
supabase/migrations/006_channels.sql
supabase/migrations/007_add_stages.sql
```

Then add the extended profile column:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS extended_profile jsonb;
```

### Running with Docker

```bash
docker compose up
```

App runs at `http://localhost:3000`.

## Deployment

Vercel is the recommended deployment target (built for Next.js App Router + streaming).

1. Import the repo on [vercel.com](https://vercel.com)
2. Add all environment variables in the Vercel dashboard
3. Add your Vercel production URL to Supabase Auth → URL Configuration → Redirect URLs: `https://your-app.vercel.app/auth/callback`

> Note: the analysis pipeline (JD extraction → match scoring → ATS suggestions) can take 15–20s end-to-end. Vercel Pro (60s function timeout) is recommended over the free tier (10s).

## Project structure

```
src/
├── app/
│   ├── api/applications/[id]/   # AI routes: extract-jd, match-score, ats-suggestions, chat
│   ├── api/profile/             # Profile PATCH endpoint
│   ├── api/parse-resume/        # PDF/DOCX → structured JSON
│   ├── api/sarvam-stt/          # Voice transcription proxy
│   ├── applications/[id]/       # Workspace (JD input, analysis, assistant)
│   ├── dashboard/               # Application overview
│   ├── tracker/                 # Kanban board
│   ├── profile/                 # Resume + extended profile editing
│   └── onboarding/              # 3-step onboarding (info, resume, extended profile)
├── components/onboarding/       # Step components
└── lib/
    ├── supabase/                 # SSR + client helpers
    └── types.ts                  # Shared TypeScript types
```
