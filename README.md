# Profit Pulse

Profit Pulse helps small-business owners bring sales, costs, and stock into one place and see what may need a closer look. Calculations are done by fixed rules in the backend. AI is planned only to help write questions and explain findings. It must never invent figures or promise profit.

**Current status:** the hackathon MVP is complete for local use. It includes secure accounts, tailored monthly assessments, deterministic analytics, and Gemini-powered wording for questions and explanations.

## What is in this repository

| Part | Folder | Technology |
|---|---|---|
| Website | `src/`, `public/` | React 19 and Vite 8, custom CSS |
| API | `server/` | Node.js, Express 4, MongoDB with Mongoose, JWT, bcryptjs |

The website uses hash-based addresses, so it works on any static host without extra settings.

| Address | Page |
|---|---|
| `#home` (or no hash) | Landing page |
| `#why`, `#workflow`, `#business-types`, `#preview`, `#questions`, `#references` | Sections of the landing page |
| `#signup`, `#login` | Account screens |
| `#get-started` | Business setup and monthly check-in |
| `#dashboard` | Your numbers |
| `#settings` | Account name and password settings |
| `#privacy`, `#terms` | Legal pages |
| anything else | "Page not found" |

## Run it on your computer

You need **Node.js 20.19 or newer** (or 22.12 or newer) and a MongoDB database: either MongoDB installed locally, or a free MongoDB Atlas cluster.

### 1. Set up the API

```bash
cd server
npm install
cp .env.example .env        # on Windows PowerShell: Copy-Item .env.example .env
```

Open `server/.env` and set:

| Setting | What to put |
|---|---|
| `PORT` | Leave as `5000`, or choose another free port. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/profit-pulse` for local MongoDB, or your Atlas `mongodb+srv://...` string. |
| `JWT_SECRET` | A long random value of at least 32 characters. Create one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `CLIENT_URL` | The website address, `http://localhost:5173` for local work. Separate several addresses with commas. |
| `GEMINI_API_KEY` | Optional. A server-only Gemini key for AI-written assessment questions and dashboard explanations. |
| `GEMINI_MODEL` | Optional. The Gemini or Gemma model name. `GEMMA_MODEL` also works. |

Then start it:

```bash
npm run dev
```

If a setting is missing or wrong, the API stops and lists exactly what to fix. Check it works by opening `http://localhost:5000/api/health`. You should see `{"status":"ok"}`.

### 2. Start the website

In a second terminal, from the project root:

```bash
npm install
npm run dev
```

Open the address Vite prints (normally `http://localhost:5173`).

The website talks to `http://localhost:5000/api` by default. To use another address, copy `.env.example` to `.env` in the project root and change `VITE_API_URL`. Include the `/api` part. Restart `npm run dev` after changing it.

## Useful commands

| Command (project root) | What it does |
|---|---|
| `npm run dev` | Starts the website with live reload. |
| `npm run build` | Creates the production website in `dist/`. |
| `npm run preview` | Serves the built website locally to check it. |
| `npm run server` | Starts the API (same as `npm run dev` inside `server/`). |
| `npm run check` | Syntax-checks the API files and builds the website. |
| `npm test` | Runs core question, validation, and analytics tests without using MongoDB or Gemini. |
| `npm run smoke` | Checks a running local API and the built website artifact without creating an account or changing data. Run `npm run check` first. |

## Keeping secrets safe

- Real `.env` files are listed in `.gitignore` and must never be committed. Only the `.env.example` files are shared.
- Anything starting with `VITE_` is visible to everyone who opens the website. Never put a secret there.
- `JWT_SECRET`, the database address, and any future AI key stay in `server/.env` only.
- If a key, database password, or JWT secret is ever pasted into a chat, terminal log, or commit, rotate it immediately.

## Common problems

- **"Could not reach the Profit Pulse server"** on a form: the API is not running, or `VITE_API_URL` points to the wrong address.
- **API stops with a list of settings**: open `server/.env` and fix each item listed.
- **"Could not connect to MongoDB"**: start your local MongoDB, or check the Atlas connection string, password, and that your IP address is allowed in Atlas.
- **"Port 5000 is already in use"**: stop the other program or change `PORT` (and `VITE_API_URL` to match).
- **Browser blocks the request (CORS)**: `CLIENT_URL` must match the website address exactly, including `http` or `https` and the port.

## What the MVP does

1. Owners sign up, log in, edit their name, change passwords, and log out. Password changes invalidate older sessions.
2. Owners select a category and business type. The assessment only shows relevant specialist fields, such as stock for grocery businesses or fuel for transport businesses.
3. Gemini can add up to three optional business-specific questions. If AI is unavailable, the built-in question bank is used.
4. Monthly details are saved per business and month. The server validates currency, numeric values, expenses, and optional answers before storing them.
5. The dashboard shows income, recorded costs, money left, cost breakdown, month-to-month trend, and data-backed checks.
6. Gemini can explain the existing findings in plain language. It receives calculated insights, not a request to invent financial facts.
7. Owners can select an older saved month from the dashboard.

## Deploy for the demo

1. For Embarko, deploy this repository as one app from the project root. It builds the React website and serves it with the Express API under the same address.
2. In Embarko App setup, add `MONGODB_URI`, a new 32+ character `JWT_SECRET`, `GEMINI_API_KEY`, and `GEMINI_MODEL=gemma-4-26b-a4b-it`. Do not upload `server/.env`.
3. Leave `VITE_API_URL` unset for the one-app Embarko deployment. The live website automatically uses its own `/api` address. `CLIENT_URL` can be left blank because browser requests are same-domain.
4. Before presenting, run `npm run check`, `npm test`, and `npm run smoke`; then create one demo account, save at least two months of sample data, and try the AI explanation button once.

## Suggested two-minute demo

1. Open the landing page and explain that Profit Pulse turns monthly business details into clear checks.
2. Sign in, choose a business type such as a cafe, grocery shop, salon, or transport business.
3. Show that the questions adapt to the business and that Gemini can add optional questions.
4. Save monthly sales and expense details, then open the dashboard.
5. Point to the largest cost, month comparison, and one evidence-based recommendation. Use **Explain with AI** to show a simple explanation.

All figures on the landing page are fictional examples made for the hackathon. They are not market data and not promises of results.

## More detail

- API guide: [`server/README.md`](server/README.md)
- Product decisions and rules: [`docs/product-foundation.md`](docs/product-foundation.md)
