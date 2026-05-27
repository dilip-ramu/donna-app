# Donna — Claude Code Guide

## Project
Next.js 15 App Router personal secretary app. Supabase for auth + database.

## Deploy to Vercel
Run the deploy script — it handles everything interactively:
```bash
bash deploy.sh
```
It will:
1. Install Vercel CLI if missing
2. Log you in to Vercel
3. Ask for your Supabase env vars (skip if already set in dashboard)
4. Deploy to production
5. Optionally add a custom domain and print the DNS records to add

## Key commands
```bash
npm run dev       # local dev server
npm run build     # production build
npx tsc --noEmit  # type-check only
bash deploy.sh    # deploy to Vercel + optional custom domain
```

## Environment variables needed on Vercel
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## After adding a custom domain
Go to Supabase → Authentication → URL Configuration and add:
- Site URL: `https://your-custom-domain.com`
- Redirect URLs: `https://your-custom-domain.com/**`

## Stack
- Next.js 15, TypeScript, Tailwind CSS
- Supabase (auth + postgres)
- Deployed on Vercel
- CSS custom properties for dark mode (`html.dark`)
- Dancing Script font for cursive greeting (`var(--font-script)`)
