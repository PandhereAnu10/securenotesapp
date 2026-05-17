# Secure Notes API

Node.js / TypeScript / Express REST backend for a multi-user notes service with JWT auth, Prisma, and PostgreSQL (Supabase).

## Setup

1. Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` — Supabase PostgreSQL connection string
   - `JWT_SECRET` — long random secret
   - `PORT` (optional, default `3000`)

2. Install dependencies and sync the database:

```bash
npm install
npx prisma db push
```

3. Run locally:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Register user (409 if exists) |
| POST | `/login` | No | Returns `{ access_token }` |
| GET | `/notes` | Bearer | Notes owned by or shared with user |
| POST | `/notes` | Bearer | Create note |
| GET | `/notes/:id` | Bearer | Get note (owner or shared) |
| PUT | `/notes/:id` | Bearer | Update note (owner only) |
| DELETE | `/notes/:id` | Bearer | Delete note (owner only) |
| POST | `/notes/:id/share` | Bearer | Share with another user |
| PATCH | `/notes/:id/pin` | Bearer | **Custom:** pin/unpin note |
| GET | `/openapi.json` | No | OpenAPI 3.0 spec |
| GET | `/about` | No | Author & feature info |

## Project Structure

```
src/
  controllers/   # Request handlers
  middleware/    # JWT auth, Zod validation, errors
  routes/        # Express routers
  validators/    # Zod schemas
  openapi/       # OpenAPI spec
  lib/           # Prisma client
  utils/         # JWT, note access helpers
prisma/
  schema.prisma  # Users, Notes, NoteShares
```

## Deploy

Deploy to Render, Railway, or Fly.io. Set `DATABASE_URL`, `JWT_SECRET`, and run `prisma db push` (or migrations) on deploy.
