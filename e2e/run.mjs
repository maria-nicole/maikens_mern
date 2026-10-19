// Runs the Selenium suite.
//
// It starts everything the tests need - the API, the built frontend and a real Chrome -
// points the API at its own test database, runs the specs, and cleans up afterwards.
// Nothing here touches the shop's real data or the live site.
//
//   node e2e/run.mjs            run everything
//   node e2e/run.mjs --headed   watch the browser work
//   node e2e/run.mjs --keep     leave the test database behind
//   node e2e/run.mjs --grep cart  run only the specs whose name matches
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Mocha from "mocha";
import { API_URL, FRONTEND_URL, BACKEND_PORT, FRONTEND_PORT, TEST_DB_NAME } from "./config.mjs";
import { dbNameOf, toTestUri, seedTestDatabase, dropTestDatabase } from "./fixtures.mjs";
import { startMailbox, MAILBOX_PORT } from "./mailbox.mjs";
import { launchBrowser, closeBrowser, setDriver, getDriver, saveShot, setMailbox } from "./helpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FRONTEND_DIR = path.join(ROOT, "frontend");
const VITE_BIN = path.join(FRONTEND_DIR, "node_modules", "vite", "bin", "vite.js");

const args = process.argv.slice(2);
const headed = args.includes("--headed");
const keepDatabase = args.includes("--keep");
const grepIndex = args.indexOf("--grep");
const grep = grepIndex !== -1 ? args[grepIndex + 1] : null;

const isWindows = process.platform === "win32";

const SPECS = ["storefront.spec.mjs", "account.spec.mjs", "checkout.spec.mjs", "admin.spec.mjs"];

const children = [];
let mailbox = null;
let shuttingDown = false;

const stopChildren = () => {
    shuttingDown = true;
    for (const child of children) {
        if (!child.killed) {
            try { child.kill(); } catch { /* already gone */ }
        }
    }
    children.length = 0;
};

const say = (message) => console.log(`  ${message}`);

/* ------------------------------ environment ------------------------------- */

dotenv.config({ path: path.join(ROOT, ".env") });

const originalUri = process.env.MONGO_URI;
if (!originalUri) {
    console.error("MONGO_URI is not set in the root .env, so there is no database to test against.");
    process.exit(1);
}

const testUri = toTestUri(originalUri);
const originalDb = dbNameOf(originalUri);
const testDb = dbNameOf(testUri);

// The suite must never be able to write to the shop's own database.
if (testDb !== TEST_DB_NAME || originalDb === testDb) {
    console.error(
        `Refusing to run: the test connection string points at "${testDb}" instead of "${TEST_DB_NAME}".`
    );
    process.exit(1);
}
if (/(^|\.)(mongodb\.net|onrender\.com)/i.test(testUri) === false && !/mongodb(\+srv)?:\/\//i.test(testUri)) {
    console.error("Refusing to run: that does not look like a MongoDB connection string.");
    process.exit(1);
}

/* --------------------------------- ports ---------------------------------- */

const portInUse = (port) =>
    new Promise((resolve) => {
        const socket = net.connect({ port, host: "127.0.0.1" });
        const done = (result) => {
            socket.destroy();
            resolve(result);
        };
        socket.setTimeout(700);
        socket.once("connect", () => done(true));
        socket.once("timeout", () => done(false));
        socket.once("error", () => done(false));
    });

const busy = [];
for (const port of [BACKEND_PORT, FRONTEND_PORT, MAILBOX_PORT]) {
    if (await portInUse(port)) busy.push(port);
}
if (busy.length) {
    console.error(
        `Port ${busy.join(" and ")} is already in use. Stop whatever is running there first ` +
        "(usually `npm run dev` in the backend and the frontend) and try again - the tests " +
        "start their own copies."
    );
    process.exit(1);
}

/* --------------------------------- helpers -------------------------------- */

const waitForHttp = async (url, timeoutMs = 90000) => {
    const deadline = Date.now() + timeoutMs;
    let last = "no answer";
    while (Date.now() < deadline) {
        try {
            const res = await fetch(url);
            if (res.ok) return true;
            last = `HTTP ${res.status}`;
        } catch (err) {
            last = err.message;
        }
        await sleep(300);
    }
    throw new Error(`${url} never came up (${last})`);
};

const runToCompletion = (cmd, cmdArgs, options) =>
    new Promise((resolve, reject) => {
        const child = spawn(cmd, cmdArgs, { ...options, stdio: "inherit" });
        child.on("error", reject);
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
    });

/* ---------------------------------- run ----------------------------------- */

const main = async () => {
    console.log("\nMaikens - Selenium end-to-end tests\n");

    say(`database: ${originalDb} -> ${testDb} (the shop's own data is not touched)`);

    await seedTestDatabase(testUri);
    say("seeded the test database");

    /* -- the stand-in for Brevo -- */
    mailbox = await startMailbox();
    setMailbox(mailbox);
    say(`mailbox up on ${mailbox.url}`);

    /* -- the API -- */
    const backend = spawn(process.execPath, ["backend/server.js"], {
        cwd: ROOT,
        env: {
            ...process.env,
            MONGO_URI: testUri,
            NODE_ENV: "development",
            // The mail goes to the stand-in above, so a code really is "sent" and can be
            // read back, but nothing reaches Brevo and no real address is ever emailed.
            MAIL_API_URL: mailbox.url,
            BREVO_API_KEY: "e2e-test-key",
            MAIL_FROM_EMAIL: "selenium@maikens.test",
            MAIL_FROM_NAME: "Maikens Gown & Barong",
            CORS_ORIGIN: FRONTEND_URL,
        },
        stdio: ["ignore", "pipe", "pipe"],
    });
    children.push(backend);

    let carry = "";
    const readBackend = (chunk) => {
        carry += chunk.toString();
        const lines = carry.split(/\r?\n/);
        carry = lines.pop() || "";
        for (const line of lines) {
            if (line.trim()) console.log(`  [api] ${line}`);
        }
    };
    backend.stdout.on("data", readBackend);
    backend.stderr.on("data", (chunk) => console.log(`  [api] ${chunk.toString().trimEnd()}`));
    backend.on("exit", (code) => {
        if (!shuttingDown && code !== 0) console.error(`  [api] the backend stopped unexpectedly (code ${code})`);
    });

    await waitForHttp(`${API_URL}/health`);
    say(`api up on ${API_URL}`);

    /* -- the frontend -- */
    say("building the frontend");
    await runToCompletion(process.execPath, [VITE_BIN, "build"], {
        cwd: FRONTEND_DIR,
        env: { ...process.env, VITE_API_URL: API_URL },
    });

    const preview = spawn(process.execPath, [VITE_BIN, "preview", "--port", String(FRONTEND_PORT), "--strictPort"], {
        cwd: FRONTEND_DIR,
        env: { ...process.env, VITE_API_URL: API_URL },
        stdio: ["ignore", "pipe", "pipe"],
    });
    children.push(preview);
    preview.stdout.on("data", (chunk) => console.log(`  [web] ${chunk.toString().trimEnd()}`));
    preview.stderr.on("data", (chunk) => console.log(`  [web] ${chunk.toString().trimEnd()}`));

    await waitForHttp(FRONTEND_URL);
    say(`frontend up on ${FRONTEND_URL}`);

    /* -- the browser -- */
    const browser = await launchBrowser({ headed });
    setDriver(browser);
    say(`chrome open${headed ? " (headed)" : " (headless)"}`);

    /* -- the specs -- */
    const mocha = new Mocha({ timeout: 90000, slow: 8000, reporter: "spec" });
    if (grep) mocha.grep(grep);
    for (const spec of SPECS) mocha.addFile(path.join(__dirname, "specs", spec));

    mocha.rootHooks({
        // A failing test leaves a picture of the page behind.
        afterEach: async function () {
            if (this.currentTest?.state === "failed") {
                const d = getDriver();
                if (d) {
                    try {
                        const file = await saveShot(d, this.currentTest.title);
                        console.log(`\n    screenshot: ${file}`);
                    } catch { /* the browser may already be gone */ }
                }
            }
        },
        afterAll: async () => {
            await closeBrowser();
        },
    });

    const failures = await new Promise((resolve) => mocha.run(resolve));
    return failures;
};

/* -------------------------------- clean up -------------------------------- */

let exitCode = 0;
try {
    const failures = await main();
    exitCode = failures ? 1 : 0;
} catch (err) {
    console.error(`\nThe test run could not finish: ${err.message}`);
    exitCode = 1;
} finally {
    stopChildren();
    if (mailbox) await mailbox.close();
    if (!keepDatabase) {
        try {
            await dropTestDatabase(testUri);
            console.log("\nTest database dropped.");
        } catch (err) {
            console.error(`\nCould not drop the test database: ${err.message}`);
        }
    } else {
        console.log(`\nTest database kept (${testDb}).`);
    }
}

console.log("");
process.exit(exitCode);
