# CLAUDE.md

## Repository Overview

This repository contains two applications:

1. **stash-app/** - A self-hosted read-it-later app (Pocket alternative) using vanilla JS + Supabase
2. **wellbeing-cards/** - A React-based "Well-Being Conversation Cards" app for facilitating 1-on-1 discussions

## Well-Being Conversation Cards (`wellbeing-cards/`)

### Tech Stack
- React 18 with Vite
- No backend required - static SPA with hardcoded question data
- CSS modules for styling
- Deployable to Vercel, Netlify, or any static host

### Development Commands
```bash
cd wellbeing-cards
npm install
npm run dev      # Start dev server
npm run build    # Production build (output: dist/)
npm run preview  # Preview production build
```

### Architecture
- `src/data/questions.js` - All 40 questions across 5 categories
- `src/components/HomeScreen.jsx` - Category selection grid
- `src/components/QuestionScreen.jsx` - Full-screen question display
- `src/App.jsx` - Main app with screen routing and state management
- Question deduplication tracked in React state (no persistence needed)

### Design Principles
- Large text (60-70px) for screen sharing in Zoom/Teams
- Calming, professional color palette per category
- Responsive: desktop + tablet
- Smooth CSS transitions between screens

## Stash App (`stash-app/`)

### Tech Stack
- Vanilla JavaScript (no build step)
- Supabase backend (PostgreSQL + Edge Functions)
- Chrome extension + PWA web app

### Key Files
- `extension/` - Chrome browser extension
- `web/` - PWA web application
- `supabase/` - Database schema and edge functions
- `SETUP.md` - Detailed setup guide
