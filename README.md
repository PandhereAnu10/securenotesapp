# Secure Notes

A professional, full-stack notes application built for the Epifi technical assessment. This project includes a multi-user backend API and a minimalist dark-mode frontend.

## Live Links
- **Backend API (Submission URL):** [https://securenotesapp-yrvy.onrender.com](https://securenotesapp-yrvy.onrender.com)
- **Frontend UI:** [https://secure-notes-frontend-vjxm.onrender.com/](https://secure-notes-frontend-vjxm.onrender.com/)

## Unique Feature: Note History & Audit Trail
Standard note apps usually only save the latest version. I implemented a **Version History** system to handle collaborative environments more effectively.
- **How it works:** Every time a note is updated, the system saves a snapshot of the content and the user who made the change.
- **Restore Logic:** Users can view the history of any note and restore the content to a previous state with a single click. This ensures no data is ever accidentally lost during collaboration.

## Tech Stack
- **Backend:** Node.js, TypeScript, Express.js
- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui
- **Database:** PostgreSQL (Supabase) with Prisma ORM
- **Authentication:** JWT (JSON Web Tokens) and Bcrypt
- **Security:** Row-Level Security (RLS) and Zod Schema Validation
- **Deployment:** Dockerized services on Render

## Core Functionality
- **Multi-user Auth:** Secure registration and login.
- **Note Management:** Full CRUD (Create, Read, Update, Delete) functionality.
- **Sharing & Roles:** Share notes with other users as either a 'Viewer' or 'Editor'.
- **Invite System:** Notes shared with you must be accepted before they appear in your list.
- **Rich Text:** Support for bold, italic, and checklists with auto-syncing.

## API Endpoints
The following endpoints are exposed for the assessment's automated tests:

| Path | Method | Description |
| :--- | :--- | :--- |
| `/about` | GET | Developer info and feature description. |
| `/openapi.json` | GET | Full API documentation (Swagger 3.0). |
| `/register` | POST | Register a new user. |
| `/login` | POST | Login and receive an access_token. |
| `/notes` | GET | List all owned and shared notes. |
| `/notes/:id/share`| POST | Share a note with another user. |

## Local Setup
1. **Clone the Repo:** `git clone https://github.com/PandhereAnu10/securenotesapp.git`
2. **Backend:**
   - `npm install`
   - Set `.env` (DATABASE_URL, JWT_SECRET).
   - `npx prisma db push && npm run dev`
3. **Frontend:**
   - `cd notes-frontend && npm install`
   - `npm run dev`

---
*Built for the Epifi Engineering Team.:)*
