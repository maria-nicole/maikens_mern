// The buying journey: sign up, add a gown to the cart, and order it.
import assert from "node:assert/strict";
import { By } from "selenium-webdriver";
import { API_URL, FRONTEND_URL, GOWN, GOWN_IMAGE, DELIVERY_FEE, GCASH_NUMBER, DELIVERY_ADDRESS } from "../config.mjs";
import { seeded } from "../fixtures.mjs";
import {
    getDriver, waitForVisible, waitForText, bodyText, typeInto, clickText, signUpAndVerify, clearSession,
} from "../helpers.mjs";

const SHOPPER = {
    username: "SeleniumShopper",
    email: "shopper@maikens.test",
    password: "Shopperpass1",
};

const stockOf = async () => {
    const res = await fetch(`${API_URL}/api/products`);
    const products = await res.json();
    const gown = products.find((p) => p._id === seeded.productId);
    return gown?.totalStock;
};

describe("Cart and checkout", () => {
    it("adds a gown to the cart", async () => {
        const d = getDriver();
        await clearSession(d);
        await signUpAndVerify(d, SHOPPER);

        await d.get(`${FRONTEND_URL}/product/${seeded.productId}`);
        // A size has to be picked first.
        const size = await waitForVisible(d, By.xpath('//button[@aria-pressed][normalize-space(.)="M"]'));
        await size.click();
        await clickText(d, "Add to cart");

        await waitForText(d, "to your cart");
    });

    it("shows the gown in the cart with its price", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/profile?tab=cart`);
        const text = await waitForText(d, GOWN.name);
        assert.ok(text.includes("21,500"), `the cart should show the price. It said:\n${text.slice(0, 400)}`);
    });

    it("places the order and confirms it", async () => {
        const d = getDriver();
        const stockBefore = await stockOf();

        await d.get(`${FRONTEND_URL}/profile?tab=cart`);
        await clickText(d, "Proceed to Checkout");

        await typeInto(d, 'input[name="address"]', DELIVERY_ADDRESS);
        await typeInto(d, 'input[name="gcash"]', GCASH_NUMBER);

        const expected = GOWN.price + DELIVERY_FEE;
        await clickText(d, `Place Order — ₱${expected.toLocaleString("en-PH")}`);

        const text = await waitForText(d, "Order placed!");
        assert.ok(text.includes(expected.toLocaleString("en-PH")), `the total should be shown. It said:\n${text.slice(0, 400)}`);

        // The gown came out of stock to make the order.
        const stockAfter = await stockOf();
        assert.equal(stockAfter, stockBefore - 1, "one gown should have come out of stock");
    });

    it("lists the order in the customer's own order history", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/profile?tab=orders`);
        const text = await waitForText(d, GOWN.name);
        assert.ok(text.includes("21,650"), `the order total should be shown. It said:\n${text.slice(0, 600)}`);
    });

    it("empties the cart once the order is placed", async () => {
        const d = getDriver();
        await d.get(`${FRONTEND_URL}/profile?tab=cart`);
        const text = await waitForText(d, "Your cart is empty.");
        assert.match(text, /Your cart is empty/i);
    });
});
