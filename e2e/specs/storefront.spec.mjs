// The public side of the shop: the pages anyone can see without an account.
import assert from "node:assert/strict";
import { FRONTEND_URL, GOWN } from "../config.mjs";
import { seeded } from "../fixtures.mjs";
import {
    getDriver, waitForText, bodyText, typeInto, clickText,
} from "../helpers.mjs";

describe("Storefront", () => {
    it("opens on the boutique's home page", async () => {
        const d = getDriver();
        await d.get(FRONTEND_URL);
        const text = await waitForText(d, "Maikens");
        assert.match(text, /Maikens/i, "the boutique's name should be on the page");
    });

    it("lists the gown in the catalog", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/catalog`);
        const text = await waitForText(d, GOWN.name);
        assert.ok(text.includes(GOWN.name), "the gown should be listed in the catalog");
    });

    it("opens the gown's own page and shows its price", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/product/${seeded.productId}`);
        const text = await waitForText(d, GOWN.name);
        assert.ok(text.includes("21,500"), `the price should be shown. Page said:\n${text.slice(0, 400)}`);
    });

    it("takes a message from the contact form", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/contact`);
        await typeInto(d, "#contact-name", "Selenium Visitor");
        await typeInto(d, "#contact-email", "visitor@maikens.test");
        await typeInto(d, "#contact-subject", "Gown inquiry");
        await typeInto(d, "#contact-message", "Do you still have the gown in medium?");
        await clickText(d, "Send message");
        await waitForText(d, "Thanks, your message has been sent.");
    });

    it("refuses a contact message with no text in it", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/contact`);
        await typeInto(d, "#contact-name", "Selenium Visitor");
        await typeInto(d, "#contact-email", "visitor@maikens.test");
        await clickText(d, "Send message");
        const text = await bodyText(d);
        assert.match(text, /Please write a message/i, "the form should say what is missing");
    });
});
