# Shared Notes Website

Collaborative note board that anyone with access to the site can contribute to. Notes are stored on the server, so they remain available even after restarts.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open http://localhost:3000/ in your browser.

## Features

- Add notes with an optional name.
- Notes persist to disk (`data/notes.json`) so they survive restarts.
- Everyone visiting the site sees the same list of notes.

## Development

Use hot reload with:

```bash
npm run dev
```

This runs the server with `nodemon` to automatically restart when files change.


