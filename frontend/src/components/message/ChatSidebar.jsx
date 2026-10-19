import { Link } from "react-router-dom";
import { Clock, ImagePlus, Lightbulb, MapPin, Package, Palette, Shirt } from "lucide-react";

// The "who we are / what you can share" column, hidden on small screens
export default function ChatSidebar({ open, ready, onPhoto, onPicker }) {
  return (
    <aside className="hidden flex-col gap-7 overflow-y-auto border-r border-gray-100 bg-gray-50 p-6 lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-lg font-bold text-yellow-700/89">
          M
        </div>
        <div>
          <p className="font-semibold leading-tight text-neutral-800">MAIKENS Gown &amp; Barong</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
            <span className={`h-2 w-2 rounded-full ${open ? "bg-green-500" : "bg-zinc-300"}`} />
            {open ? "Open now" : "Closed right now"}
          </p>
        </div>
      </div>

      <div className="space-y-3 text-sm text-zinc-600">
        <p className="flex items-start gap-2.5">
          <Clock size={15} className="mt-0.5 shrink-0 text-yellow-700/89" />
          <span>
            Tuesday to Sunday, 9:00 AM – 6:00 PM
            <br />
            <span className="text-zinc-400">Closed on Mondays</span>
          </span>
        </p>
        <p className="flex items-start gap-2.5">
          <MapPin size={15} className="mt-0.5 shrink-0 text-yellow-700/89" />
          <span>
            Stall A18 Disenyo Pandi, Wedding Depot, Grace Park Street, Bagong Barrio, Pandi, Bulacan
          </span>
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-800">Share in chat</h3>
        <div className="space-y-1.5">
          {[
            { label: "Upload a photo", icon: ImagePlus, onClick: onPhoto },
            { label: "My customization", icon: Palette, onClick: () => onPicker("customization") },
            { label: "My order", icon: Package, onClick: () => onPicker("order") },
            { label: "A product from the catalog", icon: Shirt, onClick: () => onPicker("product") },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                disabled={!ready}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-neutral-800 transition-colors hover:border-yellow-600/89 hover:text-yellow-700/89 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon size={16} className="text-yellow-700/89" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg bg-rose-50 p-4 text-sm text-zinc-600">
        <p className="mb-1 flex items-center gap-1.5 font-medium text-neutral-800">
          <Lightbulb size={14} className="text-yellow-700/89" />
          Faster quotes
        </p>
        Send a photo of the gown you like, your event date, and your size. We can usually quote much faster with
        those three.
      </div>

      <Link
        to="/catalog"
        className="mt-auto text-sm font-medium text-yellow-700/89 transition-colors hover:text-yellow-600/89"
      >
        Browse the catalog
      </Link>
    </aside>
  );
}
