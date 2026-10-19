import { useEffect, useState } from "react";
import { MAX_AVATAR_MB, PH_PHONE } from "./accountShared";

/**
 * The edit state for the profile card: the avatar and the contact fields are saved
 * together in one request, so they share one form.
 *
 * Lives at page level (Profile.jsx) because two places use it: ContactCard /
 * ProfileCard for the fields, and SettingsPanel's "Edit Profile Information" link.
 */
export default function useProfileForm(profile, saveProfile) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: "", address: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Free the temporary preview URL when it changes or the page unmounts
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  const start = () => {
    setForm({ phone: profile?.phone || "", address: profile?.address || "" });
    setError("");
    setSaved(false);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview("");
    setError("");
  };

  const change = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setError(`Image must be ${MAX_AVATAR_MB}MB or smaller.`);
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
    if (!editing) {
      setForm({ phone: profile?.phone || "", address: profile?.address || "" });
      setEditing(true);
    }
  };

  const save = async () => {
    const phone = form.phone.replace(/\s/g, "");
    if (phone && !PH_PHONE.test(phone)) {
      setError("Please enter a valid mobile number (e.g. 0917 234 5678).");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("phone", phone);
      body.append("address", form.address.trim());
      if (avatarFile) body.append("avatar", avatarFile);

      await saveProfile(body);

      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview("");
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return {
    editing, form, saving, error, saved,
    avatarPreview, hasNewPhoto: !!avatarFile,
    start, cancel, change, pickAvatar, save,
  };
}
