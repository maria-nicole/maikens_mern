// Signing up, confirming the email, and signing back in.
import assert from "node:assert/strict";
import { By } from "selenium-webdriver";
import { CUSTOMER } from "../config.mjs";
import {
    getDriver, waitForVisible, waitForText, bodyText, typeInto, clickText,
    register, login, signUpAndVerify, waitForCode, clearSession,
} from "../helpers.mjs";

const NEW_ACCOUNT = {
    username: "SeleniumNewcomer",
    email: "newcomer@maikens.test",
    password: "Newcomerpass1",
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

        // The account menu only appears once somebody is signed in.
        await waitForVisible(d, By.css('button[aria-label="Account menu"]'));
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
        await waitForVisible(d, By.css('button[aria-label="Account menu"]'));
    });

    it("refuses a wrong password", async () => {
        const d = getDriver();
        await login(d, { email: CUSTOMER.email, password: "NotThePassword1" });
        await waitForText(d, "Invalid credentials.");
    });

    it("signs the customer out again", async () => {
        const d = getDriver();
        await login(d, CUSTOMER);
        const menu = await waitForVisible(d, By.css('button[aria-label="Account menu"]'));
        await menu.click();
        await waitForText(d, "Sign out");
        await clickText(d, "Sign out");
        await waitForVisible(d, By.css('a[href="/login"]'));
    });
});
