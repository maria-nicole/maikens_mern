import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { uploadAvatar, fileUrl } from "../middleware/upload.js";
import { removeUpload } from "../utils/uploads.js";

const router = express.Router();

const PH_PHONE = /^(09|\+639)\d{9}$/; // same rule as Profile.jsx
const MAX_ADDRESS = 250;

// Parses the avatar upload and turns multer's errors into friendly JSON
const parseAvatar = (req, res, next) =>
  uploadAvatar.single("avatar")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "Image must be 2MB or smaller." : err.message;
    res.status(400).json({ message });
  });

// GET /api/users/profile: protect already strips the password
router.get("/", protect, (req, res) => {
  res.json(req.user);
});

// PUT /api/users/profile: multipart/form-data { phone, address, avatar? }
router.put("/", protect, parseAvatar, async (req, res) => {
  const fail = (status, message) => {
    if (req.file) removeUpload(fileUrl(req.file)); // don't keep orphaned uploads
    return res.status(status).json({ message });
  };

  try {
    const phone = String(req.body.phone ?? "").replace(/\s/g, "");
    const address = String(req.body.address ?? "").trim();

    if (phone && !PH_PHONE.test(phone)) {
      return fail(400, "Please enter a valid mobile number (e.g. 0917 234 5678).");
    }
    if (address.length > MAX_ADDRESS) {
      return fail(400, `Address must be ${MAX_ADDRESS} characters or fewer.`);
    }

    // Only these fields can ever be changed here (no role / email / isActive)
    const update = { phone, address };
    if (req.file) update.avatar = fileUrl(req.file);

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      returnDocument: "after",
      runValidators: true,
    }).select("-password");

    if (!user) return fail(404, "User not found.");

    // Delete the previous picture, unless it's a remote one (e.g. Google avatar).
    // removeUpload leaves anything it didn't save itself alone.
    if (req.file) removeUpload(req.user.avatar);

    res.json(user);
  } catch (err) {
    fail(400, err.message);
  }
});

export default router;
