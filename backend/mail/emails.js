import {
	verificationEmailTemplate,
	welcomeEmailTemplate,
} from "./emailTemplates.js";
import { sendMail } from "./mailer.js";

export const sendVerificationEmail = async (email, code, name) => {
	try {
		await sendMail({
			to: email,
			subject: "Your Maikens verification code",
			text: `Your Maikens verification code is ${code}. It expires in 15 minutes.`,
			html: verificationEmailTemplate({ name, code }),
		});
	} catch (error) {
		console.error("Error sending verification email:", error);
		throw new Error("Couldn't send the verification email.");
	}
};

export const sendWelcomeEmail = async (email, name) => {
	try {
		await sendMail({
			to: email,
			subject: "Welcome to Maikens Gown & Barong",
			text: `Welcome${name ? `, ${name}` : ""}! Your email is verified and your account is ready.`,
			html: welcomeEmailTemplate({ name }),
		});
	} catch (error) {
		console.error("Error sending welcome email:", error);
		throw new Error("Couldn't send the welcome email.");
	}
};
