import { User } from "lucide-react";
import { Link } from "react-router-dom";
import { SECTIONS, sectionHref } from "./accountShared";

/**
 * The section list, drawn twice from one source:
 *  - AccountNav is the page header, with a scrolling tab strip below lg screens.
 *  - SectionRail is the sticky sidebar shown on lg and up.
 *
 * Sections are real links, so the browser's back button, middle-click and
 * shared URLs all behave the way customers expect.
 */

const NAV_ITEM =
  "flex items-center gap-2 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors";
const RAIL_ITEM = "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors";

const CountBadge = ({ count }) =>
  count > 0 ? (
    <span className="bg-rose-100 text-yellow-600/89 text-xs font-semibold px-1.5 py-0.5 rounded-full">{count}</span>
  ) : null;

export default function AccountNav({ section, counts = {} }) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-10 py-4 flex items-center gap-3">
        <User size={20} className="text-yellow-700/89" />
        <h1 className="text-lg font-semibold text-gray-800">My Account</h1>
      </div>

      <div className="lg:hidden px-4 sm:px-6 flex gap-6 overflow-x-auto">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          const active = item.key === section;
          return (
            <Link
              key={item.key}
              to={sectionHref(item.key)}
              className={`${NAV_ITEM} ${active ? "border-yellow-700/89 text-yellow-600/89" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              <Icon size={14} />
              {item.label}
              <CountBadge count={counts[item.key] || 0} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SectionRail({ section, counts = {} }) {
  return (
    <nav aria-label="Account sections" className="hidden lg:block sticky top-24 space-y-1">
      {SECTIONS.map((item) => {
        const Icon = item.icon;
        const active = item.key === section;
        return (
          <Link
            key={item.key}
            to={sectionHref(item.key)}
            aria-current={active ? "page" : undefined}
            className={`${RAIL_ITEM} ${active ? "bg-yellow-600/89 text-white" : "text-gray-600 hover:bg-white hover:text-yellow-700/89"}`}
          >
            <Icon size={16} />
            <span className="flex-1 text-left">{item.label}</span>
            <CountBadge count={counts[item.key] || 0} />
          </Link>
        );
      })}
    </nav>
  );
}
