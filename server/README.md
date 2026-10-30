# Profit Pulse API

Express and MongoDB service for Profit Pulse. Requires Node.js 20 or newer.

## Start it

```bash
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
npm run dev              # development, restarts on file changes
npm start                # plain start, for hosting
npm run check            # syntax-checks every source file
```

## Settings (`server/.env`)

The server checks these when it starts. If anything is missing or wrong it prints a list of problems and stops. Secret values are never printed.

| Setting | Required | Rule |
|---|---|---|
| `PORT` | No (default 5000) | Whole number from 1 to 65535. |
| `MONGODB_URI` | Yes | Starts with `mongodb://` or `mongodb+srv://`. |
| `JWT_SECRET` | Yes | At least 32 characters, and not the example text. |
| `CLIENT_URL` | Yes | One or more website addresses (comma separated) allowed to call the API, for example `http://localhost:5173`. Used for CORS. |
| `GEMINI_API_KEY` | No | Enables Gemini-written assessment questions. Keep it only in `server/.env`. |
| `GEMINI_MODEL` | No | The Gemini or Gemma model name to use with `GEMINI_API_KEY`. `GEMMA_MODEL` is also accepted. If either AI setting is blank, built-in questions are used. |

Never commit `.env`. It is ignored by `.gitignore`.

## Files

| File | Purpose |
|---|---|
| `src/config.js` | Loads and validates settings. |
| `src/app.js` | Express app, database models, and routes. |
| `src/index.js` | Starts the server: checks settings, connects to MongoDB, listens. |

## Routes

All routes start with `/api`. Routes marked "Token" need the header `Authorization: Bearer <token>` from signup or login.

| Method and path | Token | What it does |
|---|---|---|
| `GET /health` | No | Returns `{"status":"ok"}`. |
| `POST /auth/signup` | No | Creates an account. Body: `name`, `email`, `password` (8 to 128 characters). |
| `POST /auth/login` | No | Logs in. Body: `email`, `password`. |
| `GET /auth/me` | Yes | Returns the signed-in user. |
| `PATCH /auth/password` | Yes | Changes a password. Body: `currentPassword`, `newPassword` (8 to 128 characters). Returns a replacement token and invalidates older signed-in sessions. |
| `POST /assessment/questions` | Yes | Returns up to three optional, business-specific numeric questions. Uses AI only when both optional AI settings are present; otherwise uses the built-in question bank. |
| `POST /businesses` | Yes | Creates or updates the signed-in user's business. |
| `GET /businesses/current` | Yes | Returns the signed-in user's business, or `null` when setup has not started. |
| `POST /periods` | Yes | Saves a monthly report for that business. |
| `GET /periods` | Yes | Lists that business's monthly reports. |
| `GET /analytics/summary` | Yes | Dashboard figures for the latest (or `?month=YYYY-MM`) report. |
| `POST /analytics/explanation` | Yes | Uses Gemini to explain the saved, deterministic insights in simple words. Body may include `month` (`YYYY-MM`). |

Replies use plain-language `message` fields. Server errors never include stack traces or database details. Unknown `/api` addresses return a 404 message. Badly formed JSON returns 400.

Every business record is linked to the signed-in user, and routes only read the business owned by the token's user.

## Not built yet

Password change, full request validation for monthly data (Phase 4), deeper analytics with tests (Phase 5), and AI-assisted explanation of completed analysis (Phase 6).
