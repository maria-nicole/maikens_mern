import { Link } from "react-router-dom";
import { ChevronRight, Heart, LogOut, MessageCircle, ShoppingBag, Sparkles, User } from "lucide-react";
import { cardClass, sectionHref } from "./accountShared";

const ROW = "w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors";

const LINKS = [
  { label: "Your designs", to: sectionHref("designs"), icon: Sparkles },
  { label: "Your favorites", to: sectionHref("favorites"), icon: Heart },
  { label: "Your cart", to: sectionHref("cart"), icon: ShoppingBag },
  { label: "Message the boutique", to: "/message", icon: MessageCircle },
];

/* Everything that used to be scattered across three menus, plus sign out. */
export default function SettingsPanel({ profile, onEditProfile, onLogout }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <div className={`${cardClass} divide-y divide-gray-100 overflow-hidden`}>
        <button type="button" onClick={onEditProfile} className={ROW}>
          <User size={16} className="text-gray-400" />
          <span className="flex-1 text-sm text-gray-700">Edit profile information</span>
          <ChevronRight size={16} className="text-gray-300" />
        </button>

        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.label} to={link.to} className={ROW}>
              <Icon size={16} className="text-gray-400" />
              <span className="flex-1 text-sm text-gray-700">{link.label}</span>
              <ChevronRight size={16} className="text-gray-300" />
            </Link>
          );
        })}
      </div>

      <div className={`${cardClass} p-5`}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Signed in as</p>
        <p className="text-sm text-gray-800 font-medium">{profile?.username || "Customer"}</p>
        <p className="text-xs text-gray-400 mb-4 break-all">{profile?.email}</p>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
        >
          <LogOut size={15} /> Log Out
        </button>
      </div>
    </div>
  );
}
