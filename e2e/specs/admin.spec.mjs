// The owner's console: seeing the shop's orders and looking after its accounts.
import assert from "node:assert/strict";
import { By, Select } from "selenium-webdriver";
import { ADMIN, CUSTOMER, OUTSIDER, PENDING, FRONTEND_URL, API_URL, DELIVERY_FEE } from "../config.mjs";
import { seeded } from "../fixtures.mjs";
import {
    getDriver, waitFor, waitForVisible, waitForText, clickText, login, clearSession, waitForToastToClear,
} from "../helpers.mjs";

const rowFor = (name) => By.xpath(`//tr[contains(., '${name}')]`);

describe("Owner console", () => {
    before(async () => {
        const d = getDriver();
        await clearSession(d);
        await login(d, ADMIN);
        // The owner lands in the console, which has its own layout rather than the
        // shop's navbar, so wait for the console itself.
        await waitForText(d, /admin console/i);
    });

    // The console's toast sits over the buttons in its tables, so let it go first.
    beforeEach(async () => {
        await waitForToastToClear(getDriver());
    });

    it("lets the owner into the console", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/admin`);
        const text = await waitForText(d, /admin console/i);
        assert.ok(text.includes("Dashboard"), "the console's own menu should be there");
    });

    it("lists the order the shop already had", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/admin?tab=orders`);
        const text = await waitForText(d, seeded.orderNo);
        assert.ok(text.includes(CUSTOMER.username), "the order should show who placed it");
    });

    it("can move an order to the next stage", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/admin?tab=orders`);
        const select = await waitForVisible(d, By.css(`select[aria-label="Update status of ${seeded.orderNo}"]`));

        // The options carry their text, not a value, so pick by what they say.
        await new Select(select).selectByVisibleText("In Production");

        const row = await waitFor(d, rowFor(CUSTOMER.username));
        await d.wait(async () => (await row.getText()).includes("In Production"), 15000,
            "the order should show its new status");
    });

    it("confirms an account by hand when its email never arrived", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/admin?tab=users`);
        const row = await waitFor(d, rowFor(PENDING.username));
        assert.ok((await row.getText()).includes("Not verified"), "the account should be marked unverified");

        const verify = await row.findElement(By.xpath(".//button[contains(normalize-space(.), 'Verify')]"));
        await verify.click();

        await d.wait(async () => !(await row.getText()).includes("Not verified"), 15000,
            "the account should no longer be marked unverified");
    });

    it("can deactivate an account and bring it back", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/admin?tab=users`);
        const row = await waitFor(d, rowFor(CUSTOMER.username));

        const deactivate = await row.findElement(By.xpath(".//button[contains(normalize-space(.), 'Deactivate')]"));
        await deactivate.click();

        const dialog = await waitForVisible(d, By.css('div[role="dialog"]'));
        const confirm = await dialog.findElement(By.xpath(".//button[contains(normalize-space(.), 'Deactivate')]"));
        await confirm.click();

        await d.wait(async () => (await row.getText()).includes("Deactivated"), 15000,
            "the account should show as deactivated");

        // And back again.
        await waitForToastToClear(d);
        const reactivate = await row.findElement(By.xpath(".//button[contains(normalize-space(.), 'Reactivate')]"));
        await reactivate.click();
        const dialog2 = await waitForVisible(d, By.css('div[role="dialog"]'));
        const confirm2 = await dialog2.findElement(By.xpath(".//button[contains(normalize-space(.), 'Reactivate')]"));
        await confirm2.click();

        await d.wait(async () => (await row.getText()).includes("Active"), 15000,
            "the account should be active again");
    });

    it("lets the owner set the delivery fee", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/admin?tab=settings`);

        const field = await waitForVisible(d, By.css("#delivery-fee"));
        await field.clear();
        await field.sendKeys("175");
        await clickText(d, "Save settings");

        // The shop now charges 175 for delivery
        const res = await fetch(`${API_URL}/api/settings`);
        const settings = await res.json();
        assert.equal(settings.deliveryFee, 175, "the delivery fee should have been saved");

        // Put it back, so the rest of the suite is not affected
        await waitForToastToClear(d);
        await field.clear();
        await field.sendKeys(String(DELIVERY_FEE));
        await clickText(d, "Save settings");
    });

    it("keeps a customer out of the owner console", async () => {
        const d = getDriver();
        await clearSession(d);
        await login(d, OUTSIDER);
        // Wait for the sign-in to finish, or we would race it with the next page.
        await d.wait(async () => !(await d.getCurrentUrl()).includes("/login"), 15000,
            "the sign-in never finished");

        await d.get(`${FRONTEND_URL}/admin`);
        const text = await waitForText(d, /access denied/i);
        assert.match(text, /403/);
    });
});
