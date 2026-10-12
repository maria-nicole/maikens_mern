import "../config/env.js"; // loads the root .env no matter where you start the server from
import { MailtrapClient } from "mailtrap";

export const mailtrapClient = new MailtrapClient({
  token: process.env.MAILTRAP_TOKEN,
  ...(process.env.MAILTRAP_ENDPOINT ? { endpoint: process.env.MAILTRAP_ENDPOINT } : {}),
});

export const sender = {
  email: process.env.MAILTRAP_SENDER_EMAIL || "hello@demomailtrap.co",
  name: "Maikens Gown & Barong",
};