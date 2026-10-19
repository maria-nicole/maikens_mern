import { Link } from "react-router-dom";
import { ChevronRight, Heart, Plus, Sparkles } from "lucide-react";
import { assetUrl, EDITABLE, fmt, formatDate, orderNo, primaryLink, sectionHref } from "./accountShared";
import { DesignPill, DesignThumb, OrderProgress, OrderThumb, SectionCard, Skeleton, StatusPill } from "./atoms";
import ProfileCard from "./ProfileCard";
import ContactCard from "./ContactCard";
import MeasurementsCard from "./MeasurementsCard";

/* A small "See all →" link into another section of the same page */
const SeeAll = ({ to, label = "See all" }) => (
  <Link to={to} className="text-xs text-yellow-700/89 font-medium flex items-center hover:underline">
    {label} <ChevronRight size={12} />
  </Link>
);

const Muted = ({ children }) => <p className="text-sm text-gray-400">{children}</p>;

/**
 * The landing section: who you are, your contact details and a taste of your
 * latest order, designs and favorites — each with a link to its full section.
 */
export default function OverviewPanel({ account, form }) {
  const { profile, orders, designs, favorites, activityLoading } = account;

  const latestOrder = orders[0];
  const latestDesigns = designs.slice(0, 2);
  const latestFavorites = favorites.slice(0, 3);
  const totalOrdered = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const measurements =
    profile?.measurements && Object.keys(profile.measurements).length > 0 ? profile.measurements : null;

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <ProfileCard
        profile={profile}
        form={form}
        loading={activityLoading}
        counts={{
          orders: orders.length,
          designs: designs.length,
          favorites: favorites.length,
          total: totalOrdered,
        }}
      />

      <div className="lg:col-span-2 space-y-4">
        {form.saved && (
          <p role="status" className="text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm">
            Profile updated.
          </p>
        )}

        <ContactCard profile={profile} form={form} />

        {/* ── Latest order ── */}
        <SectionCard
          title="Recent Order"
          action={orders.length > 0 ? <SeeAll to={sectionHref("orders")} /> : null}
        >
          {activityLoading ? (
            <Skeleton className="h-14" />
          ) : latestOrder ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <OrderThumb order={latestOrder} className="w-12 h-14 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {latestOrder.item || latestOrder.items?.[0]?.name || "Order"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {orderNo(latestOrder)} · {formatDate(latestOrder.createdAt)}
                  </p>
                </div>
                <StatusPill status={latestOrder.status} />
              </div>
              <OrderProgress status={latestOrder.status} />
            </div>
          ) : (
            <Muted>
              You haven&apos;t placed an order yet.{" "}
              <Link to="/catalog" className="text-yellow-700/89 font-medium hover:underline">
                Browse the catalog
              </Link>
            </Muted>
          )}
        </SectionCard>

        {/* ── Latest designs ── */}
        <SectionCard
          title="Your Designs"
          icon={Sparkles}
          action={designs.length > 0 ? <SeeAll to={sectionHref("designs")} /> : null}
        >
          {activityLoading ? (
            <Skeleton className="h-14" />
          ) : latestDesigns.length > 0 ? (
            <div className="space-y-3">
              {latestDesigns.map((design) => (
                <div key={design._id} className="flex items-center gap-3">
                  <DesignThumb design={design} className="w-12 h-14 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{design.base}</p>
                    <p className="text-xs text-gray-400">{formatDate(design.updatedAt || design.createdAt)}</p>
                  </div>
                  <DesignPill status={design.status} />
                  {EDITABLE.includes(design.status) && (
                    <Link
                      to={`/customize?edit=${design._id}`}
                      className="text-xs font-medium text-yellow-700/89 hover:underline whitespace-nowrap"
                    >
                      Edit
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Muted>
              Design your own gown or barong and preview it with AI before sending it to the boutique.
            </Muted>
          )}

          <Link to="/customize" className={`mt-4 w-full sm:w-auto ${primaryLink}`}>
            <Plus size={14} />
            {designs.length > 0 ? "Start a new design" : "Design your own"}
          </Link>
        </SectionCard>

        {/* ── Latest favorites ── */}
        <SectionCard
          title="Favorites"
          icon={Heart}
          action={favorites.length > 0 ? <SeeAll to={sectionHref("favorites")} /> : null}
        >
          {activityLoading ? (
            <Skeleton className="h-14" />
          ) : latestFavorites.length > 0 ? (
            <div className="space-y-3">
              {latestFavorites.map((item) => (
                <Link key={item._id} to={`/product/${item._id}`} className="flex items-center gap-3 group">
                  {item.images?.[0] ? (
                    <img
                      src={assetUrl(item.images[0])}
                      alt=""
                      className="w-12 h-14 object-cover rounded-md border border-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-14 rounded-md border border-gray-100 bg-zinc-100 flex items-center justify-center text-zinc-400 flex-shrink-0">
                      <Heart size={16} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-yellow-700/89">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {[item.category, item.eventTypes?.[0]].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-yellow-700/89">{fmt(item.price)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <Muted>
              Tap the heart on any piece you like and it will wait for you here.{" "}
              <Link to="/catalog" className="text-yellow-700/89 font-medium hover:underline">
                Browse the catalog
              </Link>
            </Muted>
          )}
        </SectionCard>

        <MeasurementsCard measurements={measurements} />
      </div>
    </div>
  );
}
