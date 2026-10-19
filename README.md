# Maikens

A made-to-order boutique platform — a customer storefront, AI-assisted atelier tools,
and two internal consoles (admin/owner and staff counter), built on the MERN stack.

**Live:** [maikens-mern.vercel.app](https://maikens-mern.vercel.app) ·
API health: [maikens-mern.onrender.com/health](https://maikens-mern.onrender.com/health)

---

## What it does

A boutique selling gowns, barong and Filipiniana pieces takes orders both online and
over the counter. This is the whole system in one repo.

**For customers**

- **Catalog & product pages** — browse, filter, favourite, read customer reviews.
- **Orders** — place an online order, follow it through production, and export an
  order slip as an image to send to the boutique on Messenger.
- **Custom designs** — describe or upload references for a made-to-order piece, get an
  AI-generated preview, and track the request while it's being discussed.
- **Virtual try-on** — see how a piece looks before committing.
- **Reviews** — once an order is completed, rate the piece 1–5 stars and write about it.
- **Messaging** — a single thread with the boutique, tied to your account.
- **Contact form** — write to the boutique without signing in; the message reaches the
  owner's console.

**For the owner (`/admin`)** — products, orders, customizations, messages, inquiries
from the contact form, reviews, user accounts, and a sales dashboard with CSV export.

**For staff (`/staff`)** — a counter console for walk-in sales, ready-to-wear stock,
customer dues and money received today.

## Tech stack

| Layer | Used |
| --- | --- |
| Backend | Node.js, Express 5, Mongoose 9 (MongoDB) |
| Auth | JWT (30-day tokens), bcryptjs, Google OAuth |
| Uploads | Multer → Cloudinary, with a local-disk fallback |
| Email | Brevo (6-digit verification codes) |
| AI | `@google/genai` (Gemini) for design previews and virtual try-on |
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4, Axios |

> The repository root **is** the backend package (`"type": "module"`), and `frontend/`
> is the Vite app. That is why setup installs dependencies twice.

## Prerequisites

- **Node.js `^20.19.0 || >=22.12.0`** (this is what Vite 8 requires)
- **MongoDB** — either a local server or a free MongoDB Atlas cluster
- **npm**

Only `MONGO_URI` is strictly required to boot. Everything else you can add as you go;
sign-in by Google, emails and the AI features each stay switched off until their keys
are set.

## Quickstart

**1. Clone and install.** Dependencies go in two places:

```bash
git clone https://github.com/maria-nicole/maikens_mern.git
cd maikens_mern

npm install              # backend
cd frontend && npm install && cd ..
```

**2. Configure the backend.** Copy the template and fill in at least `MONGO_URI`
and `JWT_SECRET`:

```bash
cp .env.example .env
```

**3. Configure the frontend:**

```bash
cp frontend/.env.example frontend/.env
```

**4. Run both.** In two terminals, from the repository root:

```bash
npm run dev              # backend  → http://localhost:5000
```

```bash
cd frontend && npm run dev   # frontend → http://localhost:5173
```

**5. Check it's alive.** [http://localhost:5000/health](http://localhost:5000/health)
should return `{"status":"ok"}`, and the storefront should load on port 5173.

If the backend log says *"Missing environment variables"*, that is the server telling you
which feature is dark and why — not necessarily an error.

## Environment variables

The backend reads the **root `.env`**. See [`.env.example`](.env.example) for a commented
template; the frontend reads **`frontend/.env`** ([template](frontend/.env.example)).

| Variable | Needed for | Notes |
| --- | --- | --- |
| `MONGO_URI` | Required | Server exits if it can't connect |
| `JWT_SECRET` | Required | Signs login tokens; any long random string |
| `GOOGLE_CLIENT_ID` | Google sign-in | Must match `VITE_GOOGLE_CLIENT_ID` |
| `BREVO_API_KEY` | Verification emails | Without it, sign-up can't send its code |
| `GEMINI_API_KEY` | AI preview & try-on | Without it, those routes return an error |
| `CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` | Image uploads | **All three or none.** Missing → local disk, which is wiped on redeploy |
| `CORS_ORIGIN` | Production | Comma-separated. Must match the frontend exactly |
| `CLIENT_URL` | Production | Base URL for links inside emails |
| `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` | Emails | The address mail comes from; must be a verified sender in Brevo |
| `GEMINI_IMAGE_MODEL` | AI previews | Optional; pins a specific model |
| `GEMINI_MAX_PER_HOUR`, `TRYON_MAX_PER_HOUR` | AI limits | Default 10 and 6 |
| `PORT` | Server | Default 5000 |

Frontend (`frontend/.env`) — only `VITE_*` variables reach the browser, so never put a
secret there:

| Variable | Notes |
| --- | --- |
| `VITE_API_URL` | Backend base URL. Optional locally; **required** for a production build |
| `VITE_GOOGLE_CLIENT_ID` | Same client id as the backend |

### Setting up email

Email runs on [Brevo](https://www.brevo.com)'s free plan (300 emails a day, no card). It
takes three steps:

1. Create a Brevo account. **Brevo approves new accounts before they can send**, so allow
   a short wait after signing up.
2. Under **Senders → Add a sender**, add the address the mail should come from — your own
   Gmail works. Brevo emails that address a 6-digit code; paste it back to verify.
3. Under **SMTP & API → API Keys**, create a key and put it in `BREVO_API_KEY`.

Then set `MAIL_FROM_EMAIL` to that same address and `MAIL_FROM_NAME` to the boutique
name. With those three set, sign-up emails a 6-digit code that the customer types in
before the account can be used.

## Creating an admin account

There is deliberately no self-service route to an admin role — `POST /api/admin/users`
requires you to already be an admin, so a fresh setup has a chicken-and-egg problem.
Register normally, then promote that account once:

1. Sign up through `/register` and verify the email.
2. Open your cluster in **MongoDB Atlas** (or `mongosh`) and find the `users` collection.
3. Set `role` on your document from `"customer"` to `"admin"`.
4. Sign out and sign in again — the new role is read from the token issued at login.

You can then reach `/admin`. From there, use **Users → Add user** to create staff
accounts, which is the supported way to add people from this point on. The staff
console lives at `/staff`.

## Optional: sample data

To get something on screen without entering products by hand:

```bash
node backend/seed.js
```

It inserts a few demo orders, customization requests and a message. It is
**additive and non-destructive** — each collection is only filled if it is currently
empty, so it is safe to re-run. For the message it needs at least one non-admin account,
so register a customer first.

## Project structure

```
maikens_mern/
├── backend/                    # Express API — this is what "npm start" runs
│   ├── config/                 # env loading, Mongo connection, Cloudinary setup
│   ├── middleware/             # JWT auth guards, Multer upload handling
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # one router per resource
│   ├── mail/                   # Brevo mailer, and the verification & welcome templates
│   ├── utils/                  # shared logic (review rules, stock, Gemini, uploads)
│   ├── scripts/                # one-off maintenance scripts
│   ├── uploads/                # local image fallback (gitignored)
│   ├── seed.js                 # optional sample data
│   └── server.js               # entry point
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── components/         # grouped by feature: account, catalog, reviews, …
│   │   ├── pages/              # route components, plus admin/ and staff/
│   │   ├── lib/                # colour helpers
│   │   ├── App.jsx             # all routes
│   │   └── main.jsx            # entry point
│   └── vercel.json             # SPA rewrite for Vercel
├── .env.example
└── package.json                # backend package (Express + Mongoose)
```

## API overview

All endpoints are mounted under `/api`. Endpoints marked **owner** require an admin
token; **auth** requires any logged-in account.

| Mount | Purpose |
| --- | --- |
| `GET /health` | Uptime check (outside `/api`) |
| `/api/users` | Register, verify email, log in, Google sign-in |
| `/api/users/profile` | Read and update your own profile and avatar |
| `/api/products` | Public catalog; **owner** create, update, delete |
| `/api/orders` | **auth** place and list your orders; staff/owner status changes |
| `/api/customizations` | **auth** design requests and their discussion |
| `/api/cart`, `/api/favorites` | **auth** the signed-in customer's cart and saved items |
| `/api/reviews` | Public read; **auth** write/edit; **owner** moderate |
| `/api/contact` | Public contact form (rate limited); **owner** read and clear |
| `/api/messages` | **auth** customer thread; staff/owner reply |
| `/api/admin/users` | **owner** list, create, promote, deactivate accounts |
| `/api/reports` | **owner** dashboard figures and CSV export |
| `/api/staff` | Staff counter console operations |
| `/api/try-on` | Virtual try-on (rate limited) |
| `/api` | AI design generation (rate limited) |

## Deployment

The two halves deploy separately. Both build from a pushed commit.

**Frontend → Vercel**

- Set **Root Directory** to `frontend`.
- Build `npm run build`, output `dist`.
- Set `VITE_API_URL` to the deployed API URL and `VITE_GOOGLE_CLIENT_ID`.
- `frontend/vercel.json` already rewrites every path to `index.html`, which is what
  lets client-side routes like `/product/:id` survive a refresh.

**Backend → Render**

- Build `npm install`, start `npm start`.
- Set every variable from the table above, and **`NODE_ENV=production`**.
- Set `CORS_ORIGIN` to the exact Vercel URL. A trailing slash or a stray port will make
  the browser block every request, and the cause is not obvious from the client side.

## Things worth knowing

- **The verification code is printed to the backend console in development.** With
  `NODE_ENV` unset or `development`, sign-up logs `[dev] verification code for …`. In
  production the code is only emailed, so `BREVO_API_KEY` must be set.
- **Uploads need Cloudinary in production.** Render's filesystem is ephemeral — without
  `CLOUDINARY_*` every image is lost on the next deploy. The server warns about this at
  boot.
- **Reviews unlock on completion, not on purchase.** A customer can review a product only
  once an online order containing it has been moved to `Completed` in the console. A
  cancelled order never qualifies, and walk-in sales are not tied to an account.
- **Cloudinary is optional, Mongo is not.** Missing Cloudinary only downgrades uploads;
  a missing `MONGO_URI` stops the server.
- **Email is sent from one personal address, and that has a limit.** `MAIL_FROM_EMAIL` is
  a single address you have verified in Brevo — a personal Gmail is fine, so no domain is
  needed. But Brevo signs the mail with its own DKIM/SPF rather than with that address,
  so a recipient's DMARC check does not line up: Gmail and Hotmail usually deliver it
  (often into the spam folder), while **Yahoo rejects it outright**. Nobody is locked out
  by this — the owner can confirm an account by hand from **Users** in the admin console,
  and a customer who never receives their code can reach the boutique through the
  contact form.
- **Cancelling an order returns its stock.** Taking an order off `Cancelled` takes that
  stock again, and refuses if it is no longer available. Orders placed before this was
  tracked fall back to the product to work out what they were holding.
- **The lint baseline is not clean.** `npm run lint` in `frontend/` reports pre-existing
  errors concentrated in the admin and staff views; they are known and unrelated to any
  given change.

## Scripts

Run from the repository root unless noted.

| Command | What it does |
| --- | --- |
| `npm run dev` / `npm start` | Start the API (`node backend/server.js`) |
| `node backend/seed.js` | Insert optional sample data (safe to re-run) |
| `node backend/scripts/generate-option-samples.js` | Regenerate the AI design option samples (needs `GEMINI_API_KEY`) |
| `node backend/scripts/migrate-uploads-to-cloudinary.js` | Move existing local uploads to Cloudinary |
| `cd frontend && npm run dev` | Start the Vite dev server |
| `cd frontend && npm run build` | Production build into `frontend/dist` |
| `cd frontend && npm run lint` | ESLint over `src` |

> `dev` and `start` run the same command. `nodemon` is installed as a dev dependency but
> is not wired to a script — use `npx nodemon backend/server.js` if you want restarts.

## Screenshots

<!-- Add images here, for example:
| Storefront | Admin console |
| --- | --- |
| ![Storefront](docs/storefront.png) | ![Admin console](docs/admin.png) |
-->

## License

All rights reserved. This project and its source code are not licensed for reuse,
redistribution or modification without permission from the author.
