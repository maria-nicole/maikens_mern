import "../config/env.js"; // loads the root .env no matter where you start the server from

/* ------------------------------------------------------------------------------------------
   Everything the app sends by email goes through here, so no other file has to know which
   provider is behind it. Currently Resend, over plain HTTPS with the built-in fetch — there
   is no SDK to install or keep up to date.

   Configure with:
     RESEND_API_KEY   required to actually send anything
     MAIL_FROM_EMAIL  must be on a domain you have verified at Resend
     MAIL_FROM_NAME   defaults to the boutique name
------------------------------------------------------------------------------------------- */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Resend's shared test sender. It only delivers to the address on the account that owns the
// key, so it is useful for a first smoke test and useless for real customers.
const TEST_SENDER = "onboarding@resend.dev";

export const sender = {
    email: process.env.MAIL_FROM_EMAIL || TEST_SENDER,
    name: process.env.MAIL_FROM_NAME || "Maikens Gown & Barong",
};

export const hasMailProvider = () => Boolean(process.env.RESEND_API_KEY);

// True while the sender is Resend's test address rather than a verified domain
export const isTestSender = () => sender.email === TEST_SENDER;

// Sends one email. Throws when the provider rejects it or nothing is configured, so the
// caller can tell the customer the code didn't go out instead of leaving them waiting.
export async function sendMail({ to, subject, text, html }) {
    if (!hasMailProvider()) {
        // In development the verification code is logged to the console before we get here,
        // so sign-up can still be finished; anywhere else this is a real failure.
        if (process.env.NODE_ENV !== "production") {
            console.warn(`[dev] RESEND_API_KEY is not set - "${subject}" to ${to} was not sent.`);
            return { skipped: true };
        }
        throw new Error("RESEND_API_KEY is not set, so no email could be sent.");
    }

    const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: `${sender.name} <${sender.email}>`,
            to: [to],
            subject,
            text,
            html,
        }),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Resend rejected the email (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
    }

    return response.json().catch(() => ({}));
}
