import { Edit2, Loader2, Mail, MapPin, Phone } from "lucide-react";
import { SectionCard } from "./atoms";
import { inputClass } from "./accountShared";

/**
 * Contact details, with the inline edit form.
 * The form itself lives in useProfileForm (shared with the photo in ProfileCard).
 */
export default function ContactCard({ profile, form }) {
  const editButton = !form.editing && (
    <button
      type="button"
      onClick={() => form.start()}
      className="flex items-center gap-1.5 text-xs text-yellow-700/89 font-medium hover:underline"
    >
      <Edit2 size={12} /> Edit
    </button>
  );

  return (
    <SectionCard title="Contact Information" action={editButton}>
      {form.editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={profile?.email || ""} disabled className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">Your email is how you sign in, so it can't be changed here.</p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Mobile number</label>
            <input
              id="phone"
              name="phone"
              value={form.form.phone}
              onChange={form.change}
              placeholder="0917 234 5678"
              inputMode="tel"
              autoComplete="tel"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              id="address"
              name="address"
              rows={2}
              value={form.form.address}
              onChange={form.change}
              placeholder="House no., street, barangay, city, province"
              autoComplete="street-address"
              className={inputClass}
            />
          </div>

          {form.error && (
            <p role="alert" className="text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 text-sm">
              {form.error}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={form.cancel}
              disabled={form.saving}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={form.save}
              disabled={form.saving}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-yellow-600/89 text-white rounded-md border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {form.saving && <Loader2 size={14} className="animate-spin" />}
              {form.saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-3 text-sm text-gray-700">
            <Mail size={15} className="text-gray-400 flex-shrink-0" />
            <span className="break-all">{profile?.email}</span>
          </p>
          <p className="flex items-center gap-3 text-sm text-gray-700">
            <Phone size={15} className="text-gray-400 flex-shrink-0" />
            {profile?.phone || <span className="text-gray-400">No mobile number saved yet.</span>}
          </p>
          <p className="flex items-start gap-3 text-sm text-gray-700">
            <MapPin size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
            {profile?.address || <span className="text-gray-400">No delivery address saved yet.</span>}
          </p>
        </div>
      )}
    </SectionCard>
  );
}
