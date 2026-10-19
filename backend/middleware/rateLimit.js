/* ------------------------------------------------------------------------------------------
   A small in-memory limiter, enough to slow down password guessing and form spam.

   It counts requests per IP inside a sliding window. It lives in the process, so it resets on
   a restart and is not shared between instances — fine for a single server, and it never
   gets in the way of normal use.
------------------------------------------------------------------------------------------- */

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 30 } = {}) {
    const hits = new Map(); // ip -> [timestamps]

    return (req, res, next) => {
        const key = req.ip || req.socket?.remoteAddress || "unknown";
        const now = Date.now();
        const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);

        if (recent.length >= max) {
            const wait = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 60000));
            return res.status(429).json({
                message: `Too many requests. Please try again in about ${wait} minute${wait === 1 ? "" : "s"}.`,
            });
        }

        recent.push(now);
        hits.set(key, recent);

        // Keep the map from growing without bound on a busy day
        if (hits.size > 5000) {
            for (const [ip, times] of hits) {
                if (!times.some((t) => now - t < windowMs)) hits.delete(ip);
            }
        }

        next();
    };
}
