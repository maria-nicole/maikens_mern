import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_URL, authHeader } from "../account/accountShared";

/* ------------------------------------------------------------------------------------------
   The data behind every bell. One place polls the unread count, loads the list when the
   dropdown opens, and marks notifications read — so the storefront navbar and the two
   consoles share exactly the same behaviour.

   The count is polled every 30s while the tab is visible, the same cadence the admin
   console already uses for its overview, and the chat uses for new messages.
------------------------------------------------------------------------------------------- */

const POLL_MS = 30000;

export function useNotifications(enabled) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadCount = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/notifications/unread-count`, { headers: authHeader() });
      setUnread(Number(data?.unread) || 0);
    } catch {
      /* the badge is cosmetic — a failed read just leaves the last number up */
    }
  }, []);

  // The badge: read once on mount, then refreshed by the interval while the tab is
  // visible. The first read is inline (with an ignore flag) so nothing leaks if the
  // bell unmounts mid-request, the same way the navbar's cart count works.
  useEffect(() => {
    if (!enabled) return;
    let ignore = false;

    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/notifications/unread-count`, { headers: authHeader() });
        if (!ignore) setUnread(Number(data?.unread) || 0);
      } catch {
        /* the badge is cosmetic — a failed read just leaves the last number up */
      }
    })();

    const t = setInterval(() => !document.hidden && loadCount(), POLL_MS);
    return () => {
      ignore = true;
      clearInterval(t);
    };
  }, [enabled, loadCount]);

  // Opening the dropdown loads the list, so what it shows is never stale. The fetch
  // lives here rather than in the button so anything opening the panel gets the same
  // refresh.
  useEffect(() => {
    if (!enabled || !open) return;
    let ignore = false;

    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/notifications`, { headers: authHeader() });
        if (!ignore) {
          setItems(Array.isArray(data?.items) ? data.items : []);
          setUnread(Number(data?.unread) || 0);
        }
      } catch {
        /* keep whatever was there; the next open tries again */
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [enabled, open]);

  // Opening the panel flags the list as loading right away (an event handler, not an
  // effect), so the dropdown says "Loading…" rather than flashing "all caught up"
  // while the request is in flight.
  const openPanel = useCallback(() => {
    setOpen(true);
    setLoading(true);
  }, []);

  // Mark one read, optimistically — a failed request is corrected by the next poll
  const markRead = useCallback(
    async (id) => {
      const target = items.find((n) => n._id === id);
      if (!target || target.read) return;
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnread((n) => Math.max(0, n - 1));
      try {
        await axios.patch(`${API_URL}/api/notifications/${id}/read`, {}, { headers: authHeader() });
      } catch {
        /* cosmetic — the badge catches up on the next poll */
      }
    },
    [items]
  );

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await axios.post(`${API_URL}/api/notifications/read-all`, {}, { headers: authHeader() });
    } catch {
      /* cosmetic — the badge catches up on the next poll */
    }
  }, []);

  return { open, setOpen, openPanel, unread, items, loading, markRead, markAllRead };
}
