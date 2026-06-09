# StageVotes

A web-based karaoke contest companion app inspired by the workflow of KaraFun, but focused on singer queue management, audience voting, and leaderboard results.

This does **not** include licensed karaoke music/video. Use KaraFun, YouTube, or another karaoke player separately while this app handles the contest.

## Features

- Host dashboard
- Create a contest event
- Add singers and songs
- Select the current singer
- Open and close audience voting
- Audience QR voting link
- One vote per singer per browser/device
- Leaderboard by average score
- Supabase database backend

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a free Supabase project, then open the SQL editor and run:

```sql
-- Paste the contents of supabase/schema.sql here
```

### 3. Environment variables

Copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

You can find those in Supabase Project Settings > API.

### 4. Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Suggested live flow

1. Create an event.
2. Add singers and songs.
3. Put your KaraFun player on one screen and KaraVote host dashboard on another.
4. Display the audience voting QR code.
5. After each singer, open voting.
6. Close voting.
7. Show the leaderboard.
