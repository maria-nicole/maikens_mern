// Editing and deleting chat messages.
//
// Each test does its whole journey with a shopper of its own, so they depend neither
// on each other nor on the specs that ran before them.
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { By, Key } from "selenium-webdriver";
import { ADMIN, API_URL, FRONTEND_URL } from "../config.mjs";
import {
    getDriver, waitFor, waitForVisible, waitForText, waitForGone, typeInto, clickText,
    signUpAndVerify, clearSession, login,
} from "../helpers.mjs";

let shopperNumber = 0;
const newShopper = () => {
    shopperNumber += 1;
    return {
        username: `SeleniumChat${shopperNumber}`,
        email: `chat${shopperNumber}@maikens.test`,
        password: "Chatshopper1",
    };
};

const sendMessage = async (d, text) => {
    await d.get(`${FRONTEND_URL}/message`);
    await typeInto(d, 'textarea[placeholder^="Type a message"]', text);
    const send = await waitForVisible(d, By.css('button[aria-label="Send message"]'));
    await send.click();
    await waitForText(d, text);
};

const openOptions = async (d) => {
    const options = await waitForVisible(d, By.css('button[aria-label="Message options"]'));
    await options.click();
};

// clear() sets the value without firing React's input event, so the controlled
// box can put the old text back. Selecting all and deleting uses real keys.
const replaceText = async (box, text) => {
    await box.sendKeys(Key.CONTROL, "a");
    await box.sendKeys(Key.BACK_SPACE);
    await box.sendKeys(text);
};

describe("Messages", () => {
    it("lets a customer edit and delete their own message", async () => {
        const d = getDriver();
        const shopper = newShopper();
        await clearSession(d);
        await signUpAndVerify(d, shopper);
        await sendMessage(d, "First draft of my question");

        // Edit: the text comes back into the composer and is saved in place
        await openOptions(d);
        await clickText(d, "Edit");
        const box = await waitForVisible(d, By.css('textarea[placeholder^="Edit your message"]'));
        await replaceText(box, "Corrected question");
        const save = await waitForVisible(d, By.css('button[aria-label="Save changes"]'));
        await save.click();

        await waitForText(d, "Corrected question");
        await waitForGone(d, "First draft of my question");
        await waitForText(d, "edited");

        // Delete: the browser dialog is auto-accepted for the test
        await d.executeScript("window.confirm = () => true;");
        await openOptions(d);
        await clickText(d, "Delete");
        await waitForGone(d, "Corrected question");
        assert.ok(
            !(await d.executeScript("return document.body.innerText")).includes("Corrected question"),
            "the deleted message should be gone from the thread"
        );
    });

    it("lets the owner delete a customer's message", async () => {
        const d = getDriver();
        const shopper = newShopper();
        await clearSession(d);
        await signUpAndVerify(d, shopper);
        await sendMessage(d, "Please remove this message");

        // The owner opens that conversation in the console
        await clearSession(d);
        await login(d, ADMIN);
        await waitForText(d, /admin console/i);
        await d.get(`${FRONTEND_URL}/admin?tab=messages`);
        const row = await waitFor(d, By.xpath(`//button[contains(., '${shopper.username}')]`));
        await row.click();
        await waitForText(d, "Please remove this message");

        // …and removes the customer's message from the thread
        await d.executeScript("window.confirm = () => true;");
        await openOptions(d);
        await clickText(d, "Delete");
        await waitForGone(d, "Please remove this message");
    });

    it("lets the owner edit their own reply, and the API keeps canned replies safe", async () => {
        const d = getDriver();
        const shopper = newShopper();
        await clearSession(d);
        await signUpAndVerify(d, shopper);
        await sendMessage(d, "Question for the owner");
        const customerToken = await d.executeScript("return localStorage.getItem('token')");

        // The owner answers, then fixes a typo in that answer
        await clearSession(d);
        await login(d, ADMIN);
        await waitForText(d, /admin console/i);
        await d.get(`${FRONTEND_URL}/admin?tab=messages`);
        const row = await waitFor(d, By.xpath(`//button[contains(., '${shopper.username}')]`));
        await row.click();
        await typeInto(d, 'textarea[aria-label="Reply"]', "Yees it is available");
        await clickText(d, "Send");
        await waitForText(d, "Yees it is available");

        const replyMenu = await waitForVisible(
            d,
            By.xpath(
                "//p[normalize-space(.)='Yees it is available']/ancestor::div[contains(@class,'group')][1]//button[@aria-label='Message options']"
            )
        );
        await replyMenu.click();
        await clickText(d, "Edit");
        const box = await waitForVisible(d, By.css('textarea[aria-label="Reply"]'));
        await replaceText(box, "Yes, it is available");
        await clickText(d, "Save");

        await waitForText(d, "Yes, it is available");
        await waitForGone(d, "Yees it is available");
        await waitForText(d, "edited");

        // The rules the menu hides are enforced by the API too
        const adminToken = await d.executeScript("return localStorage.getItem('token')");
        const headers = { Authorization: `Bearer ${adminToken}` };
        const list = await (await fetch(`${API_URL}/api/messages/conversations`, { headers })).json();
        const conversation = list.find((c) => c.customerName === shopper.username);
        assert.ok(conversation, "the conversation should be listed");
        const thread = await (await fetch(`${API_URL}/api/messages/thread/${conversation.customerId}`, { headers })).json();

        const canned = thread.find((m) => m.kind !== "message");
        assert.ok(canned, "the auto-ack should be in the thread");
        const cannedEdit = await fetch(`${API_URL}/api/messages/${canned._id}`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ body: "changed" }),
        });
        assert.equal(cannedEdit.status, 400, "canned replies should not be editable");
        const cannedDelete = await fetch(`${API_URL}/api/messages/${canned._id}`, { method: "DELETE", headers });
        assert.equal(cannedDelete.status, 400, "canned replies should not be deletable");

        const ownerReply = thread.find((m) => m.sender === "admin" && m.kind === "message");
        assert.ok(ownerReply, "the owner's edited reply should be in the thread");
        const customerEdit = await fetch(`${API_URL}/api/messages/${ownerReply._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
            body: JSON.stringify({ body: "not mine" }),
        });
        assert.equal(customerEdit.status, 403, "a customer should not edit the owner's reply");
        const customerDelete = await fetch(`${API_URL}/api/messages/${ownerReply._id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${customerToken}` },
        });
        assert.equal(customerDelete.status, 403, "a customer should not delete the owner's reply");
    });

    it("delivers a reply without waiting for the poll", async () => {
        const d = getDriver();
        const shopper = newShopper();
        await clearSession(d);
        await signUpAndVerify(d, shopper);

        // The customer's chat is open, waiting for an answer
        await d.get(`${FRONTEND_URL}/message`);
        await waitForText(d, "Welcome to MAIKENS");
        await typeInto(d, 'textarea[placeholder^="Type a message"]', "Is anyone there?");
        const send = await waitForVisible(d, By.css('button[aria-label="Send message"]'));
        await send.click();
        await waitForText(d, "Is anyone there?");
        await sleep(1000); // let the socket finish connecting

        // The owner replies through the API, the way the console would
        const login = await fetch(`${API_URL}/api/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
        });
        assert.equal(login.status, 200, "the owner should be able to sign in for the API reply");
        const { token } = await login.json();

        const list = await fetch(`${API_URL}/api/messages/conversations`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const conversations = await list.json();
        const row = conversations.find((c) => c.customerName === shopper.username);
        assert.ok(row, "the customer's conversation should be in the owner's list");

        const reply = await fetch(`${API_URL}/api/messages/thread/${row.customerId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ body: "Live reply from the owner" }),
        });
        assert.equal(reply.status, 201, "the reply should be accepted");

        // The fallback poll only runs every 30 seconds, so seeing it this fast
        // means the socket delivered it.
        await waitForText(d, "Live reply from the owner", 10000);
    });
});
