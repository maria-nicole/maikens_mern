// The bells: the shop tells a customer when their order moves, and tells the shop
// when a customer writes in.
//
// Each test does its whole journey with a shopper of its own, so they depend neither
// on each other nor on the specs that ran before them.
import assert from "node:assert/strict";
import { By, Select } from "selenium-webdriver";
import { ADMIN, FRONTEND_URL, GOWN, GCASH_NUMBER, DELIVERY_ADDRESS, deliveryFee } from "../config.mjs";
import { seeded } from "../fixtures.mjs";
import {
    getDriver, waitFor, waitForVisible, waitForText, typeInto, clickText, signUpAndVerify, clearSession, login,
    waitForToastToClear, waitForSignedIn,
} from "../helpers.mjs";

let shopperNumber = 0;
const newShopper = () => {
    shopperNumber += 1;
    return {
        username: `SeleniumBell${shopperNumber}`,
        email: `bell${shopperNumber}@maikens.test`,
        password: "Bellshopper1",
    };
};

// The bell says "Notifications" when nothing is waiting and "Notifications, N unread"
// when something is, so waiting for the word "unread" is waiting for the badge to land.
// The element is found again on every look so navigation can never leave it stale.
const storefrontBell = By.css('nav button[aria-label^="Notifications"]');
const consoleBell = By.css('button[aria-label^="Notifications"]');

const bellLabel = async (d, locator) => (await waitFor(d, locator)).getAttribute("aria-label");
// d.wait resolves with whatever the condition returned, so the label has to be
// caught in a variable as the poll goes by rather than taken from the result.
const waitBellUnread = async (d, locator) => {
    let label = "";
    await d.wait(
        async () => {
            label = await bellLabel(d, locator);
            return /unread/i.test(label);
        },
        15000,
        "the bell never showed an unread count"
    );
    return label;
};
const waitBellQuiet = (d, locator) =>
    d.wait(async () => !(await bellLabel(d, locator)).includes("unread"), 15000, "the bell never cleared its badge");

// Signs a shopper up and buys the seeded gown, ending signed in as that shopper.
const buyTheGown = async (d, shopper) => {
    await clearSession(d);
    await signUpAndVerify(d, shopper);

    await d.get(`${FRONTEND_URL}/product/${seeded.productId}`);
    // A size has to be picked first.
    const size = await waitForVisible(d, By.xpath('//button[@aria-pressed][normalize-space(.)="M"]'));
    await size.click();
    await clickText(d, "Add to cart");
    await waitForText(d, "to your cart");

    await d.get(`${FRONTEND_URL}/profile?tab=cart`);
    await clickText(d, "Proceed to Checkout");
    await typeInto(d, 'input[name="address"]', DELIVERY_ADDRESS);
    await typeInto(d, 'input[name="gcash"]', GCASH_NUMBER);
    const total = GOWN.price + (await deliveryFee());
    await clickText(d, `Place Order — ₱${total.toLocaleString("en-PH")}`);
    await waitForText(d, "Order placed!");
};

describe("Notifications", () => {
    it("tells the customer when their order moves", async () => {
        const d = getDriver();
        const shopper = newShopper();
        await buyTheGown(d, shopper);

        // The shop moves the order along
        await clearSession(d);
        await login(d, ADMIN);
        await waitForText(d, /admin console/i);
        await d.get(`${FRONTEND_URL}/admin?tab=orders`);
        const row = await waitFor(d, By.xpath(`//tr[contains(., '${shopper.username}')]`));
        const select = await row.findElement(By.xpath(".//select"));
        await new Select(select).selectByVisibleText("In Production");
        // The console confirms the change once the API has answered, which is also
        // when the notification has been written.
        await waitForText(d, 'is now "In Production"');
        await waitForToastToClear(d);

        // and the customer's bell rings — with exactly the one notification, since a
        // fresh shopper's order being placed never notified them, only the shop
        await clearSession(d);
        await login(d, shopper);
        // Signing in lands a customer on the shop's home page; wait for the token so
        // the reload of the page below can't race the login itself.
        await waitForSignedIn(d);
        await d.get(`${FRONTEND_URL}/`);
        assert.match(
            await waitBellUnread(d, storefrontBell),
            /^Notifications, 1 unread$/,
            "a fresh shopper should have exactly the one notification"
        );

        // Clicking it takes them to the order…
        const bell = await waitFor(d, storefrontBell);
        await bell.click();
        await waitForText(d, "is now In Production");
        await clickText(d, "is now In Production");
        await waitForText(d, GOWN.name);

        // …and reading it clears the badge
        await waitBellQuiet(d, storefrontBell);
    });

    it("tells the shop when a customer writes in", async () => {
        const d = getDriver();
        const shopper = newShopper();
        await clearSession(d);
        await signUpAndVerify(d, shopper);

        await d.get(`${FRONTEND_URL}/message`);
        await typeInto(d, 'textarea[placeholder^="Type a message"]', "Hello from the bell test");
        const send = await waitForVisible(d, By.css('button[aria-label="Send message"]'));
        await send.click();
        // The message shows up in the thread once it has been sent
        await waitForText(d, "Hello from the bell test");

        // and the owner's bell rings
        await clearSession(d);
        await login(d, ADMIN);
        await waitForText(d, /admin console/i);
        await waitBellUnread(d, consoleBell);

        const bell = await waitFor(d, consoleBell);
        await bell.click();
        await waitForText(d, `New message from ${shopper.username}`);

        // Marking everything read clears the badge
        await clickText(d, "Mark all as read");
        await waitBellQuiet(d, consoleBell);
    });
});
