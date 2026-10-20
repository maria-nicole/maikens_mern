// Small helpers the specs share: opening a browser, waiting for things to appear,
// typing, clicking, and grabbing the verification code the backend prints.
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { FRONTEND_URL } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SHOTS_DIR = path.join(__dirname, "screenshots");

// The browser is opened once and shared by every spec.
let driver = null;
export const setDriver = (d) => { driver = d; };
export const getDriver = () => driver;

/* ------------------------- the verification code ------------------------- */

// The tests point the mailer at a stand-in for Brevo, so the code is read out of the
// message that was "sent" rather than scraped from a log.
let mailbox = null;
export const setMailbox = (m) => { mailbox = m; };

export const waitForCode = async (email, timeoutMs = 20000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const code = mailbox?.codeFor(email);
        if (code) return code;
        await sleep(100);
    }
    throw new Error(`No verification code was sent to ${email} within ${timeoutMs}ms`);
};

// The password-reset link from the most recent email to this address. It arrives as a
// button rather than a code, so it is read out of the message's HTML the same way.
export const waitForResetLink = async (email, timeoutMs = 20000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const link = mailbox?.linkFor(email);
        if (link) return link;
        await sleep(100);
    }
    throw new Error(`No password reset link was sent to ${email} within ${timeoutMs}ms`);
};

/* ------------------------------- the browser ------------------------------ */

export const launchBrowser = async ({ headed = false } = {}) => {
    const options = new chrome.Options();
    if (!headed) options.addArguments("--headless=new");
    options.addArguments(
        "--window-size=1440,1000",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-search-engine-choice-screen",
        "--disable-features=Translate,MediaRouter,OptimizationHints"
    );
    options.setUserPreferences({ "profile.default_content_setting_values.notifications": 2 });

    const browser = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
    await browser.manage().setTimeouts({ implicit: 0, pageLoad: 45000, script: 20000 });
    return browser;
};

export const closeBrowser = async () => {
    if (driver) {
        try { await driver.quit(); } catch { /* already gone */ }
        driver = null;
    }
};

/* -------------------------------- waiting --------------------------------- */

export const waitFor = (d, locator, timeout = 15000) =>
    d.wait(until.elementLocated(locator), timeout, `Timed out waiting for ${locator}`);

export const waitForVisible = async (d, locator, timeout = 15000) => {
    const element = await waitFor(d, locator, timeout);
    await d.wait(until.elementIsVisible(element), timeout, `Found ${locator} but it never showed`);
    return element;
};

// The visible text of the page, which is what a person would read.
export const bodyText = (d) => d.executeScript("return document.body.innerText");

// Waits until the page shows some text, and says what it could see if it never did.
// The text may be a string or a regular expression - remember that a page's visible
// text comes back as it is styled, so "Admin console" can arrive as "ADMIN CONSOLE".
export const waitForText = async (d, text, timeout = 15000) => {
    const matches = (body) => (text instanceof RegExp ? text.test(body) : body.includes(text));
    const deadline = Date.now() + timeout;
    let seen = "";
    while (Date.now() < deadline) {
        seen = await bodyText(d);
        if (matches(seen)) return seen;
        await sleep(150);
    }
    throw new Error(`The page never showed "${text}".\nVisible text was:\n${seen.slice(0, 900)}`);
};

export const waitForGone = async (d, text, timeout = 15000) => {
    const deadline = Date.now() + timeout;
    let seen = "";
    while (Date.now() < deadline) {
        seen = await bodyText(d);
        if (!seen.includes(text)) return true;
        await sleep(150);
    }
    throw new Error(`The page still shows "${text}".\nVisible text was:\n${seen.slice(0, 900)}`);
};

/* ------------------------------ signed in? ------------------------------ */

// Whether anybody is signed in comes down to the token in the browser. The navbar's
// account button is there for visitors too, so it can no longer be used to tell one
// state from the other — these can.
const hasToken = (d) => d.executeScript("return !!localStorage.getItem('token')");

const waitForToken = async (d, want, timeout) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if ((await hasToken(d)) === want) return true;
        await sleep(150);
    }
    throw new Error(want ? "The browser never got a token — the sign-in never finished."
        : "The browser still has a token — the sign-out never finished.");
};

export const waitForSignedIn = (d, timeout = 15000) => waitForToken(d, true, timeout);
export const waitForSignedOut = (d, timeout = 15000) => waitForToken(d, false, timeout);

/* ------------------------------ doing things ------------------------------ */

export const typeInto = async (d, selector, value) => {
    const element = await waitForVisible(d, By.css(selector));
    await element.clear();
    await element.sendKeys(value);
    return element;
};

// XPath needs its string literals quoted, and some of ours contain an apostrophe.
const xpathLiteral = (s) => {
    if (!s.includes("'")) return `'${s}'`;
    if (!s.includes('"')) return `"${s}"`;
    return `concat('${s.split("'").join("', \"'\", '")}')`;
};

export const buttonWithText = (text, tag = "button") =>
    By.xpath(`//${tag}[contains(normalize-space(.), ${xpathLiteral(text)})]`);

export const clickText = async (d, text, tag = "button") => {
    const element = await waitForVisible(d, buttonWithText(text, tag));
    await element.click();
    return element;
};

/* ------------------------------- the journey ------------------------------ */

export const register = async (d, { username, email, password }) => {
    await d.get(`${FRONTEND_URL}/register`);
    await typeInto(d, "#username", username);
    await typeInto(d, "#email", email);
    await typeInto(d, "#password", password);
    await typeInto(d, "#confirmPassword", password);
    await clickText(d, "Create Account");
};

export const enterVerificationCode = async (d, code) => {
    const field = await waitForVisible(d, By.css('input[aria-label="Verification code"]'));
    await field.sendKeys(code);
    await clickText(d, "Verify email");
};

// The whole sign-up journey: fill the form, read the code the backend printed, type it
// in, and end up signed in.
export const signUpAndVerify = async (d, { username, email, password }) => {
    await register(d, { username, email, password });
    await waitForVisible(d, By.css('input[aria-label="Verification code"]'));
    const code = await waitForCode(email);
    await enterVerificationCode(d, code);
    await waitForSignedIn(d);
    return code;
};

// The admin console pops a little toast in the corner after an action, and it sits
// right over the buttons in the table. Wait for it to fade before clicking again.
export const waitForToastToClear = async (d, timeout = 8000) => {
    await d.wait(async () => (await d.findElements(By.css('div[role="status"]'))).length === 0, timeout,
        "the toast never went away");
};

// Forgets who is signed in: no cookies, no saved token. The page has to be on the
// shop's own address first, otherwise the browser will not let us touch its storage.
export const clearSession = async (d) => {
    await d.manage().deleteAllCookies();
    await d.get(`${FRONTEND_URL}/login`);
    await d.executeScript("try { window.localStorage.clear(); } catch (e) {}");
};

export const login = async (d, { email, password }) => {
    await d.get(`${FRONTEND_URL}/login`);
    await typeInto(d, "#email", email);
    await typeInto(d, "#password", password);
    await clickText(d, "Log In");
};

/* ------------------------------- screenshots ------------------------------ */

const slug = (text) =>
    String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "failure";

export const saveShot = async (d, name) => {
    await fs.mkdir(SHOTS_DIR, { recursive: true });
    const file = path.join(SHOTS_DIR, `${slug(name)}.png`);
    const png = await d.takeScreenshot();
    await fs.writeFile(file, png, "base64");
    return file;
};

export { assert };
