// Settings shared by the runner, the helpers and the specs.
//
// Everything the suite needs to know about the app under test lives here, so a change
// (a new port, a different seeded product) is a one-line edit.

export const BACKEND_PORT = 5000;
export const FRONTEND_PORT = 5173;

export const API_URL = `http://localhost:${BACKEND_PORT}`;
export const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

// The tests run against their own database on the same cluster, so the shop's real
// orders and customers are never touched. The runner refuses to start if this name
// does not appear in the connection string it ends up using.
export const TEST_DB_NAME = "maikens_e2e";

// Accounts the suite needs to exist before the browser opens.
export const ADMIN = {
    username: "SeleniumOwner",
    email: "owner@maikens.test",
    password: "Ownerpass1",
};

export const CUSTOMER = {
    username: "SeleniumCustomer",
    email: "customer@maikens.test",
    password: "Customerpass1",
};

// An account that has signed up but never confirmed its code - the owner has to confirm
// it by hand, which is the escape hatch for a customer whose email never arrives.
export const PENDING = {
    username: "SeleniumPending",
    email: "pending@maikens.test",
    password: "Pendingpass1",
};

// A customer who is not in the owner's circle, kept for the "kept out" test.
export const OUTSIDER = {
    username: "SeleniumOutsider",
    email: "outsider@maikens.test",
    password: "Outsiderpass1",
};

export const GOWN = {
    name: "Selenium Test Gown",
    category: "Gown",
    price: 21500,
    size: "M",
    stock: 5,
};

// A real file in backend/uploads, so the product has a picture to show.
export const GOWN_IMAGE = "/uploads/02c3dbee-f6c0-44ed-8119-29cf00e85e9c.jpg";

// What the shop charges for delivery, and the shape of a valid GCash number. Both come
// from the frontend's own account helpers; they are repeated here so a change in the
// app is a change in one place.
export const DELIVERY_FEE = 150;
export const GCASH_NUMBER = "09171234567";
export const DELIVERY_ADDRESS = "Stall A18, Wedding Depot, Grace Park Street, Pandi";

export const ORDER_STATUSES = [
    "Order Received",
    "In Production",
    "Preparing",
    "Finished Production",
    "Ready for Pick-Up",
    "Ready for Delivery",
    "Completed",
    "Cancelled",
];

// #ABC123 - the short form the shop shows an order as.
export const orderNo = (id) => `#${String(id).slice(-6).toUpperCase()}`;

// Pesos, the way the shop writes them.
export const pesos = (n) => `₱${Number(n).toLocaleString("en-PH")}`;
