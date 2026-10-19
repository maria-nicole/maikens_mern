// A stand-in for Brevo, so the tests can read the email the app "sent".
//
// The API is pointed at this little server instead of Brevo, and the verification code
// is taken out of the message it received. Nothing leaves the machine.
import http from "node:http";

export const MAILBOX_PORT = 5174;

export const startMailbox = async (port = MAILBOX_PORT) => {
    const inbox = [];

    const server = http.createServer((req, res) => {
        if (req.method !== "POST" || !req.url.includes("/v3/smtp/email")) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end("{}");
            return;
        }
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
            try {
                inbox.push(JSON.parse(body));
            } catch {
                inbox.push({ subject: "(unreadable)", htmlContent: body });
            }
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ messageId: `<test-${inbox.length}@maikens.test>` }));
        });
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", resolve);
    });

    return {
        inbox,
        url: `http://127.0.0.1:${port}/v3/smtp/email`,
        // The six-digit code in the most recent message for this address.
        codeFor(email) {
            const wanted = String(email).toLowerCase();
            for (let i = inbox.length - 1; i >= 0; i--) {
                const message = inbox[i];
                const sentTo = (message.to || []).some((t) => String(t.email).toLowerCase() === wanted);
                if (!sentTo) continue;
                const match = /(?<![\d])(\d{6})(?![\d])/.exec(message.htmlContent || "");
                if (match) return match[1];
            }
            return null;
        },
        close: () => new Promise((resolve) => server.close(resolve)),
    };
};
