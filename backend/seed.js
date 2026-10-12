// OPTIONAL, for testing only. Adds sample orders, requests and messages if those collections are empty.
// Run from the project root:  node backend/seed.js
import "./config/env.js";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import { Order } from "./models/order.model.js";
import { Customization } from "./models/customization.model.js";
import { Message } from "./models/message.model.js";

await connectDB();

if ((await Order.countDocuments()) === 0) {
  await Order.insertMany([
    { customerName: "Nicole Gopez", channel: "Online", fulfillment: "Ready-to-wear", item: "Rosa Mermaid Gown", total: 21500, status: "In Production" },
    { customerName: "Gabriel Buluran", channel: "Walk-in", fulfillment: "Made-to-order", item: "Custom Barong: jusi, gold thread", total: 8900, status: "Order Received" },
    { customerName: "Aldwin Espiritu", channel: "Online", fulfillment: "Made-to-order", item: "Custom Gown: off-shoulder, blush", total: 24000, status: "Preparing" },
    { customerName: "Christian Janhmer", channel: "Walk-in", fulfillment: "Ready-to-wear", item: "Classic Filipiniana Barong", total: 6200, status: "Ready for Pick-Up" },
  ]);
  console.log("Seeded orders");
}

if ((await Customization.countDocuments()) === 0) {
  await Customization.insertMany([
    { customerName: "Maria Seguis", base: "Full custom design", notes: "Off-shoulder neckline, blush pink, cathedral veil, floral lace on bodice.", source: "AI-generated preview + 2 reference photos" },
    { customerName: "Sammy Wesson", base: "Full custom design", notes: "Cathedral train, illusion back, sweetheart neckline, ivory satin.", source: "AI-generated preview", status: "In discussion" },
  ]);
  console.log("Seeded customization requests");
}

const customer = await User.findOne({ role: { $ne: "admin" } });
if (customer && (await Message.countDocuments()) === 0) {
  await Message.insertMany([
    { customer: customer._id, sender: "customer", body: "Hi, is the Rosa gown available in size M as well?" },
  ]);
  console.log(`Seeded a message from ${customer.username}`);
} else if (!customer) {
  console.log("No non-admin user found, so no messages were seeded. Register a customer account first.");
}

await mongoose.disconnect();
console.log("Done");