# SnappBill backend

Express API for user registration, authentication (JWT), activation email flow, and password reset. Includes a **receipt-reading agent** that turns receipt images into a structured **expense** JSON model (via OpenAI vision). Uses MongoDB via Mongoose and optional in-memory Mongo for local development.

## Requirements

- **Node.js** 18+ recommended (LTS such as v20 or v24 is fine).
- **npm** (comes with Node).

## Setup

```bash
git clone <repository-url>
cd expense-track-api
npm install
```

Create a **`config.js`** file in the project root (this file is gitignored). The app expects something like:

```javascript
module.exports = {
  mongodbConnect: 'mongodb://127.0.0.1:27017/snappbill',
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
| `mongodbConnect` | Default MongoDB URI when `MONGODB_URI` is not set (see below). |
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

The server listens on **`PORT`** or **3000** by default.

### MongoDB

- **`MONGODB_URI`** (optional): If set, the app connects to this URI and skips the in-memory server.
- **Local / default**: If `MONGODB_URI` is **not** set and **`NODE_ENV` is not `production`**, the app starts an **in-memory MongoDB** ([mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server)) so you can run without installing MongoDB. Data is not persisted after exit.
- **Production**: Set `NODE_ENV=production` and either set **`MONGODB_URI`** or rely on **`mongodbConnect`** in `config.js`. You must run a real MongoDB instance and point the URI at it.

Examples:

```bash
# Use your own MongoDB
export MONGODB_URI='mongodb://127.0.0.1:27017/snappbill'
npm start
```

```bash
# Different HTTP port
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
# then POST /api/receipts/parse with any small image or omit file — handler returns mock before multer when mock=1
```

With `RECEIPT_AGENT_MOCK=1`, the handler returns the mock response **without** requiring an upload.

## Project layout

| Path | Role |
| --- | --- |
| `bin/www` | HTTP server entry; optional in-memory Mongo bootstrap. |
| `app.js` | Express app, middleware, routes. |
| `routes/` | Route modules (`/`, `/user`, `/api/receipts`). |
| `services/` | Receipt vision agent (`receipt-agent.js`). |
| `lib/` | Shared helpers (`expense-model.js`). |
| `controllers/` | Business logic, JWT helpers, mailer. |
| `models/` | Mongoose models. |
| `views/` | Jade templates. |
| `public/` | Static assets; `.sass` compiled on the fly with `sass`. |

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Run `node ./bin/www`. |

## Security and maintenance

This codebase uses older dependencies (Express 4.15, Mongoose 4, Jade, etc.). For production, plan upgrades, dependency audits (`npm audit`), strong secrets, TLS, and a managed MongoDB service.
