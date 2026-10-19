import { welcomeEmailTemplate } from "./emailTemplates.js";
import { sendMail } from "./mailer.js";

export const sendWelcomeEmail = async (email, name) => {
	try {
		await sendMail({
			to: email,
			subject: "Welcome to Maikens Gown & Barong",
			text: `Welcome${name ? `, ${name}` : ""}! Your account is ready.`,
			html: welcomeEmailTemplate({ name }),
		});
	} catch (error) {
		console.error("Error sending welcome email:", error);
		throw new Error("Couldn't send the welcome email.");
	}
};
