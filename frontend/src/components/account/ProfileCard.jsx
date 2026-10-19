import { useRef } from "react";
import { Camera, Edit2 } from "lucide-react";
import { assetUrl, cardClass, fmt } from "./accountShared";

/**
 * The customer's photo, name and at-a-glance numbers.
 * The camera button feeds useProfileForm, which uploads the picture together
 * with the contact fields when "Save Changes" is pressed.
 */
export default function ProfileCard({ profile, form, counts = {}, loading = false }) {
  const fileRef = useRef(null);

  const rawAvatar = form?.avatarPreview || profile?.avatar || "";
  const avatarSrc = rawAvatar.startsWith("blob:") ? rawAvatar : assetUrl(rawAvatar);

  const displayName = profile?.username || "Customer";
  const initials = displayName.slice(0, 2).toUpperCase();
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-PH", { month: "long", year: "numeric" })
    : null;

  const stats = [
    { label: "Orders", value: counts.orders },
    { label: "Designs", value: counts.designs },
    { label: "Favorites", value: counts.favorites },
    { label: "Total Ordered", value: fmt(counts.total), money: true },
  ];

  return (
    <div className={`${cardClass} p-6 lg:sticky lg:top-24`}>
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          {avatarSrc ? (
            <img src={avatarSrc} alt={displayName} className="w-28 h-28 rounded-full object-cover border border-gray-100" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-rose-50 flex items-center justify-center text-yellow-700/89 text-2xl font-semibold border border-gray-100">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Change profile photo"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-yellow-600/89 text-white flex items-center justify-center hover:bg-yellow-700/89 transition-colors"
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => form?.pickAvatar(e)}
          />
        </div>

        {form?.hasNewPhoto && <p className="text-xs text-yellow-700/89 mt-3">New photo selected. Save to apply.</p>}

        <p className="font-semibold text-neutral-800 text-lg mt-4">{displayName}</p>
        <p className="text-sm text-gray-500 break-all">{profile?.email}</p>
        {memberSince && <p className="text-xs text-gray-400 mt-1">Member since {memberSince}</p>}

        {!form?.editing && (
          <button
            type="button"
            onClick={() => form?.start()}
            className="mt-4 flex items-center gap-1.5 text-xs text-yellow-700/89 font-medium hover:underline"
          >
            <Edit2 size={12} /> Edit profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-gray-100">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-rose-50 rounded-md py-2.5 text-center">
            <p className={`font-semibold text-neutral-800 leading-6 ${stat.money ? "text-sm text-yellow-700/89" : "text-lg"}`}>
              {loading ? "–" : stat.value}
            </p>
            <p className="text-xs text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
