import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { API_URL } from "./messageConfig";

// Live chat updates shared by the storefront chat and both consoles.
// The chat also polls slowly as a safety net, so a dropped socket never leaves
// a conversation stale. Handlers are read through a ref so the connection is
// made once and still sees the latest state.
export default function useChatSocket({ onNew, onUpdated, onDeleted, onReconnect } = {}) {
  const handlers = useRef({});

  // Keep the latest handlers without re-opening the connection on every render
  useEffect(() => {
    handlers.current = { onNew, onUpdated, onDeleted, onReconnect };
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(API_URL, { auth: { token }, transports: ["websocket", "polling"] });
    let connectedBefore = false;

    socket.on("message:new", (msg) => handlers.current.onNew?.(msg));
    socket.on("message:updated", (msg) => handlers.current.onUpdated?.(msg));
    socket.on("message:deleted", (payload) => handlers.current.onDeleted?.(payload));
    socket.on("connect", () => {
      // The first connect is the initial load; after a drop, refetch to catch
      // anything that happened while the socket was away (including deletions).
      if (connectedBefore) handlers.current.onReconnect?.();
      connectedBefore = true;
    });

    return () => socket.disconnect();
  }, []);
}
