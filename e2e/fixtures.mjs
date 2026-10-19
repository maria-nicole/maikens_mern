// Builds the test database: the accounts, the gown and the order the suite needs.
//
// The tests use their own database, never the shop's. The runner swaps the database
// name in the connection string and this file fills it in.
import mongoose from "mongoose";
import User from "../backend/models/User.js";
import { Product } from "../backend/models/product.model.js";
import { Order } from "../backend/models/order.model.js";
import { ADMIN, CUSTOMER, PENDING, GOWN, GOWN_IMAGE, TEST_DB_NAME } from "./config.mjs";

// What the seed created, so the specs know the ids they are looking for.
export const seeded = {
    adminId: null,
    customerId: null,
    pendingId: null,
    productId: null,
    orderId: null,
    orderNo: null,
};

// The name of the database a connection string points at.
export const dbNameOf = (uri) => {
    const withoutQuery = String(uri).split("?")[0];
    const slash = withoutQuery.lastIndexOf("/");
    return slash === -1 ? "" : withoutQuery.slice(slash + 1);
};

// The same connection string, pointed at the test database.
export const toTestUri = (uri) => {
    const [beforeQuery, ...rest] = String(uri).split("?");
    const query = rest.join("?");
    const slash = beforeQuery.lastIndexOf("/");
    if (slash === -1) throw new Error("Could not find a database name in MONGO_URI.");
    const base = beforeQuery.slice(0, slash);
    return `${base}/${TEST_DB_NAME}${query ? `?${query}` : ""}`;
};

const connect = (uri) => mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });

// Empties the test database and fills it with everything the specs expect to find.
export const seedTestDatabase = async (uri) => {
    await connect(uri);
    await mongoose.connection.dropDatabase();

    const admin = await User.create({
        username: ADMIN.username,
        email: ADMIN.email,
        password: ADMIN.password,
        role: "admin",
        isVerified: true,
    });
    const customer = await User.create({
        username: CUSTOMER.username,
        email: CUSTOMER.email,
        password: CUSTOMER.password,
        role: "customer",
        isVerified: true,
    });
    const pending = await User.create({
        username: PENDING.username,
        email: PENDING.email,
        password: PENDING.password,
        role: "customer",
        isVerified: false,
    });

    const product = await Product.create({
        name: GOWN.name,
        category: GOWN.category,
        description: "A gown created for the automated tests.",
        price: GOWN.price,
        fulfillment: "Ready-to-wear",
        customizable: false,
        status: "Active",
        sizes: [{ size: GOWN.size, stock: GOWN.stock }],
        totalStock: GOWN.stock,
        images: [GOWN_IMAGE],
    });

    // An order the owner can see straight away, so the admin console has something to
    // act on without depending on another spec having run first.
    const order = await Order.create({
        customer: customer._id,
        customerName: CUSTOMER.username,
        channel: "Online",
        fulfillment: "Ready-to-wear",
        item: GOWN.name,
        items: [
            {
                product: product._id,
                name: GOWN.name,
                size: GOWN.size,
                quantity: 1,
                unitPrice: GOWN.price,
                image: GOWN_IMAGE,
            },
        ],
        total: GOWN.price,
        status: "Order Received",
        deliveryMethod: "Delivery",
        paymentMethod: "GCash",
        amountPaid: 0,
    });

    seeded.adminId = String(admin._id);
    seeded.customerId = String(customer._id);
    seeded.pendingId = String(pending._id);
    seeded.productId = String(product._id);
    seeded.orderId = String(order._id);
    seeded.orderNo = `#${String(order._id).slice(-6).toUpperCase()}`;

    await mongoose.disconnect();
    return seeded;
};

// Throws the test database away so nothing is left behind.
export const dropTestDatabase = async (uri) => {
    await connect(uri);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
};
