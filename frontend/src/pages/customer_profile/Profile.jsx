import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import useAccountData from "../../components/account/useAccountData";
import useProfileForm from "../../components/account/useProfileForm";
import { normalSection, sectionHref } from "../../components/account/accountShared";
import AccountNav, { SectionRail } from "../../components/account/AccountNav";
import { ErrorScreen, LoadingScreen, LoggedOutScreen, Toast } from "../../components/account/atoms";
import OverviewPanel from "../../components/account/OverviewPanel";
import OrdersPanel from "../../components/account/OrdersPanel";
import DesignsPanel from "../../components/account/DesignsPanel";
import FavoritesPanel from "../../components/account/FavoritesPanel";
import CartPanel from "../../components/account/CartPanel";
import SettingsPanel from "../../components/account/SettingsPanel";

/**
 * My Account — one page for everything a customer owns.
 *
 * This file is only the shell: it reads the section from the URL, loads the data
 * once (useAccountData) and renders one panel per section from
 * src/components/account/. The old separate pages still work: /mycart and
 * /favorites redirect into the matching section.
 */
export default function Profile({ setUser }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // The section lives in the URL, so links like /profile?tab=cart land correctly
  const section = normalSection(searchParams.get("tab"));

  const account = useAccountData({ setUser });
  const form = useProfileForm(account.profile, account.saveProfile);

  const handleLogout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
    setUser?.(null);
    navigate("/");
  };

  if (account.loading) return <LoadingScreen />;
  if (!account.loggedIn) return <LoggedOutScreen />;
  if (!account.profile) return <ErrorScreen message={account.profileError} />;

  const counts = {
    orders: account.orders.length,
    designs: account.designs.length,
    favorites: account.favorites.length,
    cart: (account.cart?.items || []).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Toast text={account.toast} />
      <AccountNav section={section} counts={counts} />

      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:grid lg:grid-cols-[210px_1fr] lg:gap-8 lg:items-start">
        <SectionRail section={section} counts={counts} />

        <div className="min-w-0 space-y-4">
          {account.activityError && (
            <p role="alert" className="text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 text-sm inline-block">
              {account.activityError}
            </p>
          )}

          {section === "overview" && <OverviewPanel account={account} form={form} />}

          {section === "orders" && (
            <OrdersPanel
              orders={account.orders}
              loading={account.activityLoading}
              reviewable={account.reviewable}
              onSaveReview={account.saveReview}
              onRemoveReview={account.removeReview}
              notify={account.notify}
            />
          )}

          {section === "designs" && (
            <DesignsPanel designs={account.designs} loading={account.activityLoading} onRemove={account.removeDesign} />
          )}

          {section === "favorites" && (
            <FavoritesPanel
              favorites={account.favorites}
              loading={account.activityLoading}
              onRemove={account.removeFavorite}
            />
          )}

          {section === "cart" && (
            <CartPanel
              cart={account.cart}
              profile={account.profile}
              busyId={account.busyId}
              changeQty={account.changeQty}
              removeItem={account.removeItem}
              setCart={account.setCart}
              reloadCart={account.reloadCart}
              reloadOrders={account.reloadOrders}
            />
          )}

          {section === "settings" && (
            <SettingsPanel
              profile={account.profile}
              onEditProfile={() => {
                form.start();
                navigate(sectionHref("overview"));
              }}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>
    </div>
  );
}
