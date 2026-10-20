// Signing up, confirming the email, and signing back in.
import assert from "node:assert/strict";
import { By } from "selenium-webdriver";
import { CUSTOMER, FRONTEND_URL } from "../config.mjs";
import {
    getDriver, waitForVisible, waitForText, waitForSignedIn, waitForSignedOut, bodyText, clickText,
    register, login, signUpAndVerify, waitForCode, clearSession,
} from "../helpers.mjs";

const NEW_ACCOUNT = {
    username: "SeleniumNewcomer",
    email: "newcomer@maikens.test",
    password: "Newcomerpass1",
};

// The account dropdown, opened. A visitor gets Log in / Register in it, a signed-in
// customer gets their own shortcuts. It is the same button in both cases.
const openMenu = async (d) => {
    const button = await waitForVisible(d, By.css('button[aria-label="Account menu"]'));
    await button.click();
    return waitForVisible(d, By.css('div[role="menu"]'));
};

describe("Accounts and email verification", () => {
    // Each test starts with nobody signed in.
    beforeEach(async () => {
        await clearSession(getDriver());
    });

    it("asks a new customer to confirm their email before the account is usable", async () => {
        const d = getDriver();
        await register(d, NEW_ACCOUNT);
        await waitForVisible(d, By.css('input[aria-label="Verification code"]'));
        const text = await bodyText(d);
        assert.match(text, /verify your email/i);
        assert.ok(
            text.includes(NEW_ACCOUNT.email),
            "the screen should say which address the code went to"
        );
    });

    it("signs the customer in once they type the code that was emailed", async () => {
        const d = getDriver();
        const email = "confirmed@maikens.test";
        await register(d, { ...NEW_ACCOUNT, username: "SeleniumConfirmed", email });

        const code = await waitForCode(email);
        assert.match(code, /^\d{6}$/, "the emailed code should be six digits");

        const field = await waitForVisible(d, By.css('input[aria-label="Verification code"]'));
        await field.sendKeys(code);
        await clickText(d, "Verify email");

        // The token is in the browser, so the account is really signed in.
        await waitForSignedIn(d);
    });

    it("refuses a code that is not right", async () => {
        const d = getDriver();
        const email = "wrongcode@maikens.test";
        await register(d, { ...NEW_ACCOUNT, username: "SeleniumWrongCode", email });
        await waitForVisible(d, By.css('input[aria-label="Verification code"]'));

        const field = await waitForVisible(d, By.css('input[aria-label="Verification code"]'));
        await field.sendKeys("000000");
        await clickText(d, "Verify email");

        await waitForText(d, "That code isn't right.");
    });

    it("refuses an address that already has an account", async () => {
        const d = getDriver();
        await register(d, { ...NEW_ACCOUNT, username: "SeleniumDuplicate", email: CUSTOMER.email });
        const text = await waitForText(d, "already exists");
        assert.match(text, /already exists/i);
    });

    it("refuses a password that is too short", async () => {
        const d = getDriver();
        await register(d, { ...NEW_ACCOUNT, username: "SeleniumWeak", email: "weak@maikens.test", password: "short" });
        const text = await waitForText(d, "8 characters");
        assert.match(text, /8 characters/i);
    });

    it("signs an existing customer back in", async () => {
        const d = getDriver();
        await login(d, CUSTOMER);
        await waitForSignedIn(d);
    });

    it("refuses a wrong password", async () => {
        const d = getDriver();
        await login(d, { email: CUSTOMER.email, password: "NotThePassword1" });
        await waitForText(d, "Invalid credentials.");
    });

    it("signs the customer out again", async () => {
        const d = getDriver();
        await login(d, CUSTOMER);
        await waitForSignedIn(d);
        await openMenu(d);
        await waitForText(d, "Sign out");
        await clickText(d, "Sign out");
        await waitForSignedOut(d);

        // The bar keeps its shape, and the same button now offers a way back in
        const menu = await openMenu(d);
        const text = await menu.getText();
        assert.match(text, /Log in/, "the signed-out menu should offer Log in");
        assert.doesNotMatch(text, /Sign out/, "the signed-out menu should not offer Sign out");
    });

    it("offers a visitor the same tidy way in from the navbar", async () => {
        const d = getDriver();
        await clearSession(d);
        await d.get(FRONTEND_URL);

        // The account button is there for a visitor too, and opens on Log in / Register
        const menu = await openMenu(d);
        const text = await menu.getText();
        assert.match(text, /Sign in to your account/, "the visitor's menu should greet them");
        assert.match(text, /Log in/, "the visitor's menu should offer Log in");
        assert.match(text, /Register/, "the visitor's menu should offer Register");

        // The cart is always there as well, and it takes a visitor to sign in
        const cart = await waitForVisible(d, By.css('a[aria-label="Cart"]'));
        await cart.click();
        await d.wait(async () => (await d.getCurrentUrl()).includes("/login"), 15000,
            "the cart should send a visitor to the sign-in page");
    });
});
