# SnappBill backend

Express API for user registration, authentication (JWT), activation email flow, and password reset. Includes a **receipt-reading agent** that turns receipt images into a structured **expense** JSON model (via OpenAI vision). Persists users in **PostgreSQL** via the **`pg`** driver, with an optional **embedded in-memory Postgres ([PGlite](https://pglite.dev))** when no database URL is configured (non-production).

## Requirements

- **Node.js** 18+ recommended (LTS such as v20 or v24 is fine).
- **npm** (comes with Node).
- **PostgreSQL** is optional for local development: if you omit `DATABASE_URL` and `config.databaseUrl`, the app uses **PGlite** in memory. Use a real server (Docker, install, or hosted) when you want persisted data or in **production**.

## Setup

```bash
git clone <repository-url>
cd expense-track-api
npm install
```

Start a real Postgres locally when you want data to survive restarts (optional):

```bash
docker compose up -d
```

This uses **`docker-compose.yml`** (user `postgres` / password `postgres`, database `snappbill` on port **5432**). Point the app at it with `DATABASE_URL` or `databaseUrl` in **`config.js`**.

Create a **`config.js`** file in the project root (this file is gitignored). You can copy from **`config.example.js`**. If `config.js` is missing and **`NODE_ENV` is `test`**, the app loads **`test/fixtures/config.js`** (used by `npm test`).

```javascript
module.exports = {
  databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:5432/snappbill',
  secret: 'your-jwt-secret',
  jwtExpire: '24h',
  baseURL: 'http://localhost:3000',
  activationTimeout: 86400,
  mailer: {
    email: 'your-smtp-user@example.com',
    password: 'your-smtp-password',
    name: 'SnappBill',
  },
  password: {
    resetTimeout: 3600,
  },
};
```

| Field | Purpose |
| --- | --- |
| `databaseUrl` | PostgreSQL connection string when `DATABASE_URL` is unset. Omit both to use **PGlite** in memory (development/test only). |
| `secret` | JWT signing secret. |
| `jwtExpire` | JWT expiry (e.g. `24h`, `7d`). |
| `baseURL` | Public base URL for links in activation and password-reset emails. |
| `activationTimeout` | Activation link validity window (seconds). |
| `mailer` | Nodemailer SMTP credentials and display name. |
| `password.resetTimeout` | Password reset token validity (seconds). |

## Running the app

```bash
npm start
```

On startup, **`bin/www`** runs **`db/migrate.js`** against **`db/schema.sql`** (creates the `users` table if needed), then listens on **`PORT`** or **3000**.

### PostgreSQL connection

- **`DATABASE_URL`** (optional): If set, it overrides `config.databaseUrl`.
- **`config.databaseUrl`**: Used when `DATABASE_URL` is not set.
- **In-memory (default for dev/test):** If **both** are unset and **`NODE_ENV` is not `production`**, **`lib/db.js`** starts **[PGlite](https://pglite.dev)** (`@electric-sql/pglite`) — a WASM Postgres inside the Node process. Data is **not** persisted after exit. You will see: `Using in-memory PostgreSQL (PGlite)...`
- **Production:** You **must** set `DATABASE_URL` or `config.databaseUrl`; PGlite is not used.

`bin/www` calls **`await initPool()`** before migrations and loading the app.

Examples:

```bash
# Real Postgres (e.g. after docker compose up -d)
export DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/snappbill'
npm start
```

```bash
# In-memory PGlite: omit DATABASE_URL and databaseUrl (and do not set NODE_ENV=production)
npm start
```

```bash
PORT=4000 npm start
```

### Debug logging

This project uses the `debug` package (namespace `snappbill-backend:server`). To see server debug output:

```bash
DEBUG=snappbill-backend:* npm start
```

## API overview

Base path for JSON user APIs: **`/user`**.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/user/register` | Register (`name`, `email`, `password` in body). |
| `GET` | `/user/activate/:id/:token` | Activate account (`id` = email). |
| `POST` | `/user/authenticate` | Login with HTTP Basic auth (`name` = email, `pass` = password). Returns JWT. |
| `POST` | `/user/is-authorized/:id` | Token check; header `x-access-token`. |
| `GET` | `/user/get/:id` | Fetch user by email; requires valid token for `:id`. |
| `POST` | `/user/pass/change/:id` | Change password (requires token). |
| `GET` | `/user/pass/reset/:id/:token` | HTML view for password reset. |
| `POST` | `/user/pass/reset/:id` | Start or complete password reset (see controller for body params). |

Authenticated routes expect header: **`x-access-token: <jwt>`**.

The home page is served at **`GET /`** (Jade view).

> **Note:** `routes/bill.js` exists in the repo but is **not** mounted in `app.js` yet, so bill endpoints are not active until you wire them in.

## Receipt agent (expense from images)

The agent lives under **`services/receipt-agent.js`** and normalizes output with **`lib/expense-model.js`**.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/receipts/parse` | Multipart upload: field **`image`** (JPEG/PNG/WebP, max ~12MB). Returns `{ expense }`. |

**Expense model** (JSON): `merchant`, `total`, `currency`, `transactionDate`, `subtotal`, `taxTotal`, `category`, `lineItems[]`, `paymentMethod`, `notes` (see `lib/expense-model.js`).

**Environment**

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Required for real parsing (except mock mode). |
| `OPENAI_RECEIPT_MODEL` | Optional override (default `gpt-4o-mini`). |
| `RECEIPT_AGENT_MOCK=1` | Returns a fixed sample expense without calling OpenAI (for local tests). |

Example (real parsing):

```bash
export OPENAI_API_KEY='sk-...'
curl -s -X POST http://localhost:3000/api/receipts/parse \
  -F "image=@/path/to/receipt.jpg" | jq .
```

Example (mock, no API key):

```bash
RECEIPT_AGENT_MOCK=1 npm start
# then POST /api/receipts/parse — handler returns mock before multer when mock=1
```

With `RECEIPT_AGENT_MOCK=1`, the handler returns the mock response **without** requiring an upload.

## Project layout

| Path | Role |
| --- | --- |
| `bin/www` | HTTP server entry; runs DB migrations then listens. |
| `app.js` | Express app, middleware, routes. |
| `db/` | SQL schema and migration runner. |
| `routes/` | Route modules (`/`, `/user`, `/api/receipts`). |
| `services/` | Receipt vision agent (`receipt-agent.js`). |
| `lib/` | DB bootstrap (`db.js`: `pg` Pool or **PGlite**), `app-config.js`, `expense-model.js`. |
| `controllers/` | Business logic, JWT helpers, mailer. |
| `models/` | User persistence (`user.js` + `pg`). |
| `test/` | Integration tests and test-only config. |
| `views/` | Jade templates. |
| `public/` | Static assets; `.sass` compiled on the fly with `sass`. |

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Run `node ./bin/www`. |
| `npm test` | Integration tests for all mounted routes (see below). |

## Testing

```bash
npm test
```

`test/endpoints.test.js` calls **`await initPool()`** first: with no `DATABASE_URL` / `databaseUrl`, tests use **PGlite** (no Docker Postgres required).

On **push** or **pull request** to `master` or `main`, [GitHub Actions](.github/workflows/ci.yml) runs `npm ci` and **`npm test`** on Node.js 20 and 22 (PGlite in CI).

`test/endpoints.test.js` uses **supertest** for `GET /`, **`/user/*`**, and **`POST /api/receipts/parse`** (receipt mock mode).

- **Config:** `lib/app-config.js` loads root `config.js` if present; otherwise, when `NODE_ENV=test`, it loads **`test/fixtures/config.js`** (no `databaseUrl`, so PGlite is used unless you set **`DATABASE_URL`** for an external DB).
- **Email:** With `NODE_ENV=test`, the mailer skips SMTP and records activation and reset tokens on **`global.__testActivationTokenByEmail`** and **`global.__testResetTokenByEmail`**.

## Security and maintenance

This codebase uses older dependencies in places (Express 4.15, Jade, etc.). For production, use strong secrets, TLS, dependency audits (`npm audit`), and a managed PostgreSQL service.
