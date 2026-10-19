import "../config/env.js"; // loads the root .env no matter where you start the server from

/* ------------------------------------------------------------------------------------------
   Everything the app sends by email goes through here, so no other file has to know which
   provider is behind it. Currently Brevo, over plain HTTPS with the built-in fetch — there
   is no SDK to install or keep up to date.

   Configure with:
     BREVO_API_KEY   required to actually send anything
     MAIL_FROM_EMAIL the address the mail comes from; must be a verified sender in Brevo
     MAIL_FROM_NAME  defaults to the boutique name

   There is no domain of our own here, so the sender is a single personal address. Brevo
   signs with its own DKIM/SPF rather than that address, so a recipient's DMARC check will
   not line up. See the README for what that means in practice.
------------------------------------------------------------------------------------------- */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export const sender = {
    email: process.env.MAIL_FROM_EMAIL || "",
    name: process.env.MAIL_FROM_NAME || "Maikens Gown & Barong",
};

export const hasMailProvider = () => Boolean(process.env.BREVO_API_KEY);

// Brevo needs to know which address to send from, and only accepts one that has been
// verified through the Brevo dashboard.
export const hasSender = () => Boolean(sender.email);

// Sends one email. Throws when the provider rejects it or nothing is configured, so the
// caller can log the failure instead of silently losing the message.
export async function sendMail({ to, subject, text, html }) {
    if (!hasMailProvider()) {
        // In development the message is logged instead of sent, so the flow can still be
        // walked through; anywhere else this is a real failure.
        if (process.env.NODE_ENV !== "production") {
            console.warn(`[dev] BREVO_API_KEY is not set - "${subject}" to ${to} was not sent.`);
            return { skipped: true };
        }
        throw new Error("BREVO_API_KEY is not set, so no email could be sent.");
    }
    if (!hasSender()) {
        throw new Error("MAIL_FROM_EMAIL is not set, so there is no address to send from.");
    }

    const response = await fetch(BREVO_ENDPOINT, {
        method: "POST",
        headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sender: { email: sender.email, name: sender.name },
            to: [{ email: to }],
            subject,
            textContent: text,
            htmlContent: html,
        }),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        // Brevo answers with { code, message }; the code is the useful half, because it
        // names the problem (unverified sender, account still under review, and so on).
        let reason = detail;
        try {
            const parsed = JSON.parse(detail);
            reason = parsed.message ? `${parsed.code ? parsed.code + ": " : ""}${parsed.message}` : detail;
        } catch {
            // not JSON - keep the raw text
        }
        throw new Error(`Brevo rejected the email (${response.status})${reason ? `: ${reason.slice(0, 300)}` : ""}`);
    }

    return response.json().catch(() => ({}));
}
