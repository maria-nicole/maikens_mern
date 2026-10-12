// Canned answers live on the server so the owner can change them without
// touching the React app. The ids must match QUICK_REPLIES in Message.jsx.
export const QUICK_REPLIES = {
  hours: {
    question: "What are your store hours?",
    answer: "We're open Tuesday to Sunday, 9:00 AM to 6:00 PM. We're closed on Mondays. 😊",
  },
  pricing: {
    question: "How much does a custom gown cost?",
    answer:
      "Custom gowns typically start at ₱3,500 depending on fabric, design complexity, and add-ons. Send us a reference photo and we'll give you a more exact quote!",
  },
  "order-status": {
    question: "How do I check my order status?",
    answer:
      "You can track your order anytime under Track an Order in your account. It updates as your piece moves through production.",
  },
  rush: {
    question: "Do you accept rush orders?",
    answer:
      "Yes, rush orders are possible depending on our current workload and the design's complexity. Let us know your event date and we'll confirm availability.",
  },
};

export const AUTO_ACK =
  "Thanks for your message! The owner will personally reply shortly. For faster answers, try one of the quick questions below.";