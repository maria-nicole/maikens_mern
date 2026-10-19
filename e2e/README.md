# End-to-end tests

These are **Selenium** tests. Selenium drives a real browser — it opens Chrome, types into
boxes, clicks buttons and then checks what appears on the page, the same way a person
would. That is the point of them: they prove the whole shop works *through* a browser,
not just that one function returns the right thing.

There are 24 of them, and they cover the journeys that matter:

| File | What it covers |
| --- | --- |
| `specs/storefront.spec.mjs` | The home page, the catalog, a product page and its price, the contact form (and its validation). |
| `specs/account.spec.mjs` | Signing up, being asked to confirm the emailed code, being signed in by that code, a wrong code, a duplicate address, a weak password, signing back in, a wrong password, signing out. |
| `specs/checkout.spec.mjs` | Adding a gown to the cart, the cart and its price, placing the order, the order appearing in the customer's own history, the stock coming down, the cart emptying. |
| `specs/admin.spec.mjs` | The owner's console, the orders in it, moving an order to the next stage, confirming an account by hand, deactivating and reactivating an account, and a customer being kept out of the console. |

## Running them

```bash
npm install     # picks up selenium-webdriver and mocha
npm run test:e2e
```

That is the whole thing. The runner starts everything it needs and stops it again
afterwards.

| Option | What it does |
| --- | --- |
| `npm run test:e2e -- --headed` | Watch the browser work instead of running unseen |
| `npm run test:e2e -- --keep` | Leave the test database behind so you can look at it |
| `npm run test:e2e -- --grep cart` | Run only the tests whose name matches |

You need **Google Chrome** installed. Selenium 4.6+ ships *Selenium Manager*, which
downloads the matching `chromedriver` for you the first time — so there is no driver to
install by hand, but the first run does need an internet connection.

## How the runner works

`run.mjs` does the following, in order:

1. Reads the root `.env` and works out a connection string for a database called
   **`maikens_e2e`** — the shop's own database is never touched.
2. Refuses to go on unless the database name really is `maikens_e2e`, and refuses to go on
   if ports 5000, 5173 or 5174 are already busy (usually because you left `npm run dev`
   running).
3. Empties that database and fills it with what the tests expect: an owner, a customer,
   an account that has never been confirmed, one gown with stock, and one order.
4. Starts the API on port 5000 against that database, and the built frontend on port 5173.
5. Opens a real Chrome and runs the specs.
6. Closes everything and drops the test database.

## The email problem, and how it is solved

The shop does not let anybody use an account until they have confirmed a 6-digit code
that was emailed to them. A browser test cannot open a mailbox — so the tests point the
mailer at a small stand-in for Brevo that runs on port 5174 (`mailbox.mjs`).

The API is told to send there instead of to Brevo, using one extra setting:

```
MAIL_API_URL=http://127.0.0.1:5174/v3/smtp/email
```

The stand-in keeps every message it is given, and the test reads the code straight out of
it. So the test exercises the genuine thing — the code is generated, hashed, stored and
checked by the real `POST /api/users/verify-email` route — and only the trip through the
internet is skipped. **No real email is ever sent, and no real address is ever emailed.**

## When a test fails

A failing test leaves a screenshot of the page in `e2e/screenshots/`, named after the
test. That folder is in `.gitignore`, so the pictures stay on your machine.

The failure message also prints the text that was actually on the page, which is usually
enough to see what went wrong without opening the picture at all.

## The files

| File | What it is |
| --- | --- |
| `run.mjs` | Starts and stops everything, then runs the specs. |
| `config.mjs` | The accounts, the gown, the ports — everything the tests share. |
| `fixtures.mjs` | Builds and empties the test database. |
| `helpers.mjs` | Opening the browser, waiting for things, typing, clicking, screenshots. |
| `mailbox.mjs` | The stand-in for Brevo that the codes are read out of. |
| `specs/` | The tests themselves. |

## If something goes wrong

**"Port 5000 is already in use"** — something is still running. Stop your own
`npm run dev` (backend and frontend) and run the tests again.

**"The page never showed ..."** — the test timed out waiting for something. The message
prints the text that *was* on the page, which usually shows the reason (a different
wording, or a page that had not finished loading).

**Chrome will not start** — check that Chrome is installed and up to date, and that no
other Chrome instance is holding on to your profile. Selenium Manager downloads a driver
the first time; after that it is cached.

**"Refusing to run: the test connection string points at ..."** — the runner found that
`MONGO_URI` in your `.env` does not have a database name it can swap for `maikens_e2e`.
Have a look at the connection string in the root `.env`.
