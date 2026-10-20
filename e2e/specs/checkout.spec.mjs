// The buying journey: sign up, add a gown to the cart, and order it.
//
// Each test does the whole journey for itself, with a shopper of its own, so they do
// not depend on each other and any one of them can be run on its own.
import assert from "node:assert/strict";
import { By } from "selenium-webdriver";
import { API_URL, FRONTEND_URL, GOWN, deliveryFee, SHIPPING_METHOD, GCASH_NUMBER, DELIVERY_ADDRESS } from "../config.mjs";
import { seeded } from "../fixtures.mjs";
import {
    getDriver, waitForVisible, waitForText, typeInto, clickText, signUpAndVerify, clearSession,
} from "../helpers.mjs";

let shopperNumber = 0;

const newShopper = () => {
    shopperNumber += 1;
    return {
        username: `SeleniumShopper${shopperNumber}`,
        email: `shopper${shopperNumber}@maikens.test`,
        password: "Shopperpass1",
    };
};

const stockOf = async () => {
    const res = await fetch(`${API_URL}/api/products`);
    const products = await res.json();
    const gown = products.find((p) => p._id === seeded.productId);
    return gown?.totalStock;
};

// Signs a brand new customer up, confirms their email, and puts a gown in their cart.
const startShopping = async (d) => {
    // Start from nobody signed in, or the sign-up page would send us away.
    await clearSession(d);
    await signUpAndVerify(d, newShopper());

    await d.get(`${FRONTEND_URL}/product/${seeded.productId}`);
    // A size has to be picked first.
    const size = await waitForVisible(d, By.xpath('//button[@aria-pressed][normalize-space(.)="M"]'));
    await size.click();
    await clickText(d, "Add to cart");
    await waitForText(d, "to your cart");
};

const goToCart = async (d) => {
    await d.get(`${FRONTEND_URL}/profile?tab=cart`);
};

const goToCheckout = async (d) => {
    await clickText(d, "Proceed to Checkout");
    await typeInto(d, 'input[name="address"]', DELIVERY_ADDRESS);
    await typeInto(d, 'input[name="gcash"]', GCASH_NUMBER);
};

const placeTheOrder = async (d) => {
    await goToCheckout(d);
    const total = GOWN.price + (await deliveryFee());
    await clickText(d, `Place Order — ₱${total.toLocaleString("en-PH")}`);
    // Wait for the order to be made, or we would go looking for it before it exists.
    await waitForText(d, "Order placed!");
    return total;
};

describe("Cart and checkout", () => {
    it("adds a gown to the cart", async () => {
        const d = getDriver();
        await startShopping(d);

        await goToCart(d);
        const text = await waitForText(d, GOWN.name);
        assert.ok(text.includes("1 item in your cart"), `the cart should hold one gown. It said:\n${text.slice(0, 400)}`);
    });

    it("shows the gown in the cart with its price", async () => {
        const d = getDriver();
        await startShopping(d);

        await goToCart(d);
        const text = await waitForText(d, GOWN.name);
        assert.ok(text.includes("21,500"), `the cart should show the price. It said:\n${text.slice(0, 400)}`);
    });

    it("places the order and confirms it", async () => {
        const d = getDriver();
        await startShopping(d);
        const stockBefore = await stockOf();

        await goToCart(d);
        const total = await placeTheOrder(d);

        const text = await waitForText(d, "Order placed!");
        assert.ok(
            text.includes(total.toLocaleString("en-PH")),
            `the total should be shown. It said:\n${text.slice(0, 400)}`
        );

        // The gown came out of stock to make the order.
        const stockAfter = await stockOf();
        assert.equal(stockAfter, stockBefore - 1, "one gown should have come out of stock");
    });

    it("lists the order in the customer's own order history", async () => {
        const d = getDriver();
        await startShopping(d);

        await goToCart(d);
        await placeTheOrder(d);

        await d.get(`${FRONTEND_URL}/profile?tab=orders`);
        const text = await waitForText(d, GOWN.name);
        assert.ok(
            text.includes((GOWN.price + (await deliveryFee())).toLocaleString("en-PH")),
            `the order total should be shown. It said:\n${text.slice(0, 600)}`
        );
    });

    it("tells the customer who will deliver the order", async () => {
        const d = getDriver();
        await startShopping(d);

        await goToCart(d);
        await goToCheckout(d);
        const text = await waitForText(d, SHIPPING_METHOD);
        assert.ok(
            text.includes(SHIPPING_METHOD),
            `the checkout should name the courier. It said:\n${text.slice(0, 600)}`
        );

        // And it is on the order in the customer's own history
        const total = GOWN.price + (await deliveryFee());
        await clickText(d, `Place Order — ₱${total.toLocaleString("en-PH")}`);
        await waitForText(d, "Order placed!");

        await d.get(`${FRONTEND_URL}/profile?tab=orders`);
        const orders = await waitForText(d, GOWN.name);
        assert.ok(
            orders.includes(SHIPPING_METHOD),
            `the order should say who delivers it. It said:\n${orders.slice(0, 600)}`
        );
    });

    it("empties the cart once the order is placed", async () => {
        const d = getDriver();
        await startShopping(d);

        await goToCart(d);
        await placeTheOrder(d);

        await goToCart(d);
        const text = await waitForText(d, "Your cart is empty.");
        assert.match(text, /Your cart is empty/i);
    });
});
