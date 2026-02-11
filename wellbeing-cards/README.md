# Well-Being Conversation Cards

A full-screen web app that helps leaders facilitate meaningful 1-on-1 discussions with their team members about workplace well-being.

## Features

- **5 conversation categories**: Workload & Capacity, Boundaries & Balance, Mental Well-Being, Connection & Support, Growth & Development
- **40 thoughtful questions** (8 per category) designed for workplace well-being conversations
- **Random question mode** that picks from any category
- **Duplicate prevention** — tracks which questions have been shown and cycles through all before repeating
- **Presentation-ready** — large text (up to 70px) designed for screen sharing in Zoom/Teams
- **Responsive design** — works on desktop and tablets

## Quick Start

```bash
cd wellbeing-cards
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Set the **Root Directory** to `wellbeing-cards`
4. Vercel auto-detects Vite — click Deploy

Or use the Vercel CLI:

```bash
cd wellbeing-cards
npx vercel --prod
```

## Deploy to Netlify

1. Push this repo to GitHub
2. Go to [netlify.com](https://netlify.com) and import the repository
3. Set **Base directory** to `wellbeing-cards`
4. Set **Build command** to `npm run build`
5. Set **Publish directory** to `wellbeing-cards/dist`
6. Click Deploy

## Build for Production

```bash
npm run build
```

Output goes to `dist/` — serve it with any static file server.

## Tech Stack

- React 19 + Vite 7
- No backend required (static SPA)
- No database (questions are hardcoded)
- Google Fonts (Inter)
