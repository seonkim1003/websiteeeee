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
- Delete notes individually when they’re no longer needed.

## Development

Use hot reload with:

```bash
npm run dev
```

This runs the server with `nodemon` to automatically restart when files change.

## Deploying to Fly.io (free tier)

1. Install Fly CLI: [https://fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/).
2. Log in: `fly auth login`.
3. Review the included `Dockerfile` and `fly.toml` (update the `app` name to your Fly app).
4. Run `fly launch` and answer the prompts (skip Postgres, skip immediate deploy).
5. Create a volume for persistent notes: `fly volumes create notes_data --size 3 -r <region>`.
6. In `fly.toml` ensure:
   ```toml
   [[mounts]]
     source = "notes_data"
     destination = "/data"
   ```
7. Set the data directory secret: `fly secrets set DATA_DIR=/data`.
8. Deploy: `fly deploy`.

The app will be available at `https://<app-name>.fly.dev`, with notes stored on the mounted volume so they survive restarts.


