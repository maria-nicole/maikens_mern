// Shared Gemini image helper + a small per-user hourly limiter.
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const httpError = (status, message) => Object.assign(new Error(message), { status });

// Same model list as before. Set GEMINI_IMAGE_MODEL in .env to pin one.
const getModels = () =>
    process.env.GEMINI_IMAGE_MODEL
        ? [process.env.GEMINI_IMAGE_MODEL]
        : ["gemini-3.1-flash-lite-image", "gemini-3-pro-image"];

export function createLimiter({ windowMs = 60 * 60 * 1000, max = 10 } = {}) {
    const usage = new Map(); // userId -> [timestamps]
    return {
        take(userId) {
            const now = Date.now();
            const recent = (usage.get(userId) || []).filter((t) => now - t < windowMs);
            if (recent.length >= max) {
                usage.set(userId, recent);
                return { ok: false, minutes: Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 60000)) };
            }
            recent.push(now);
            usage.set(userId, recent);
            return { ok: true, remaining: max - recent.length };
        },
        giveBack(userId) {
            const list = usage.get(userId);
            if (list?.length) list.pop();
        },
    };
}

// parts: [{ text } | { inlineData: { mimeType, data } }]
export async function generateWithGemini(parts, { aspectRatio = "3:4" } = {}) {
    const MODELS = getModels();

    for (const model of MODELS) {
        let res;
        try {
            res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
                body: JSON.stringify({
                    contents: [{ role: "user", parts }],
                    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
                }),
                signal: AbortSignal.timeout(90_000),
            });
        } catch (err) {
            console.error("Gemini request failed:", err.message);
            throw httpError(
                504,
                err.name === "TimeoutError"
                    ? "The AI took too long to respond. Please try again."
                    : "Couldn't reach the AI service. Please try again."
            );
        }

        const data = await res.json().catch(() => ({}));

        if (res.status === 404) {
            console.error(`Gemini model "${model}" not found, trying the next one`);
            continue;
        }
        if (!res.ok) {
            const detail = data?.error?.message || "";
            console.error("Gemini error:", res.status, detail);
            if (res.status === 429) throw httpError(429, "The AI service is busy right now. Please try again in a minute.");
            if (res.status === 401 || res.status === 403 || /api key/i.test(detail)) {
                throw httpError(503, "Image generation is temporarily unavailable.");
            }
            throw httpError(502, "The AI couldn't generate a preview. Please try again.");
        }

        const candidate = data.candidates?.[0];
        const part = (candidate?.content?.parts || []).find((p) => (p.inlineData || p.inline_data)?.data);
        if (!part) {
            console.error("Gemini returned no image:", data.promptFeedback?.blockReason || candidate?.finishReason);
            throw httpError(422, "The AI couldn't make an image from that photo. Try a clearer, full-body photo.");
        }
        const inline = part.inlineData || part.inline_data;
        return { data: inline.data, mimeType: inline.mimeType || inline.mime_type || "image/png" };
    }

    console.error(`No Gemini image model worked (tried ${MODELS.join(", ")}). Set GEMINI_IMAGE_MODEL in .env.`);
    throw httpError(503, "Image generation is temporarily unavailable.");
}