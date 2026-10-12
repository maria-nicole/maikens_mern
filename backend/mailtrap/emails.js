import {
	verificationEmailTemplate,
	welcomeEmailTemplate,
} from "./emailTemplates.js";
import { mailtrapClient, sender } from "./mailtrap.config.js";

export const sendVerificationEmail = async (email, code, name) => {
	try {
		await mailtrapClient.send({
			from: sender,
			to: [{ email }],
			subject: "Your Maikens verification code",
			text: `Your Maikens verification code is ${code}. It expires in 15 minutes.`,
			html: verificationEmailTemplate({ name, code }),
			category: "Email Verification",
		});
	} catch (error) {
		console.error("Error sending verification email:", error);
		throw new Error("Couldn't send the verification email.");
	}
};

export const sendWelcomeEmail = async (email, name) => {
	try {
		await mailtrapClient.send({
			from: sender,
			to: [{ email }],
			subject: "Welcome to Maikens Gown & Barong",
			text: `Welcome${name ? `, ${name}` : ""}! Your email is verified and your account is ready.`,
			html: welcomeEmailTemplate({ name }),
			category: "Welcome",
		});
	} catch (error) {
		console.error("Error sending welcome email:", error);
		throw new Error("Couldn't send the welcome email.");
	}
};