import { Message } from "../models/message.model.js";

// One row per customer with the latest message and unread count.
// (Same pipeline as GET /api/messages/conversations. You can make that route use this too.)
export const conversationSummaries = () =>
    Message.aggregate([
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: "$customer",
                last: { $first: "$$ROOT" },
                unread: {
                    $sum: { $cond: [{ $and: [{ $eq: ["$sender", "customer"] }, { $eq: ["$read", false] }] }, 1, 0] },
                },
            },
        },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0,
                customerId: "$_id",
                customerName: { $ifNull: ["$user.username", "Unknown customer"] },
                preview: {
                    $cond: [
                        { $gt: [{ $strLenCP: { $ifNull: ["$last.body", ""] } }, 0] },
                        "$last.body",
                        {
                            $cond: [
                                { $gt: [{ $size: { $ifNull: ["$last.images", []] } }, 0] },
                                "📷 Photo",
                                {
                                    $cond: [
                                        { $ifNull: ["$last.share.title", false] },
                                        { $concat: ["Shared: ", "$last.share.title"] },
                                        "",
                                    ],
                                },
                            ],
                        },
                    ],
                },
                time: "$last.createdAt",
                unread: 1,
            },
        },
        { $sort: { time: -1 } },
    ]);