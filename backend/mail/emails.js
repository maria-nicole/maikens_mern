import {
	verificationEmailTemplate,
	welcomeEmailTemplate,
	passwordResetRequestTemplate,
	passwordResetSuccessTemplate,
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

export const sendPasswordResetEmail = async (email, resetURL) => {
	try {
		await sendMail({
			to: email,
			subject: "Reset your Maikens password",
			text: `Reset your Maikens password here: ${resetURL} — the link expires in 1 hour. If you didn't ask for this, you can ignore this email.`,
			html: passwordResetRequestTemplate({ resetURL }),
		});
	} catch (error) {
		console.error("Error sending password reset email:", error);
		throw new Error("Couldn't send the password reset email.");
	}
};

export const sendPasswordChangedEmail = async (email) => {
	try {
		await sendMail({
			to: email,
			subject: "Your Maikens password was changed",
			text: "Your Maikens password was just changed. If this wasn't you, please contact the boutique right away.",
			html: passwordResetSuccessTemplate(),
		});
	} catch (error) {
		console.error("Error sending password changed email:", error);
		throw new Error("Couldn't send the password changed email.");
	}
};
