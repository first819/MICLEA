import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, getUserId } from "../_shared/clients.ts";
import { getTier, meets } from "../_shared/tier.ts";
import { anthropic, MODEL_DEEP, loadUserContext, resumeSummary } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const db = serviceClient();
    const tier = await getTier(db, userId);
    if (!meets(tier, "ultra")) return json({ error: "upgrade_required", need: "ultra" }, 403);

    // field = which section to improve ("summary" | "b0" | "b1" | "skills"); optional
    const { field = null, jobDescription = null } = await req.json().catch(() => ({}));
    const ctx = await loadUserContext(db, userId);

    const stream = anthropic.messages.stream({
      model: MODEL_DEEP,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      system:
        "You are Micl, an elite résumé writer. Rewrite the requested section into quantified, " +
        "role-tailored, active-voice impact. Match the candidate's real experience — never invent " +
        "facts. Return JSON: " +
        `[{"field": string, "title": string, "why": string, "after": string}]. No prose.`,
      messages: [{
        role: "user",
        content:
          `Target role: ${ctx.targetRole}\n` +
          (jobDescription ? `Job description:\n${jobDescription}\n` : "") +
          (field ? `Improve only the "${field}" field.\n` : "Suggest improvements for summary, b0, b1, and skills.\n") +
          `\nCurrent résumé:\n${resumeSummary(ctx)}`,
      }],
    });

    const msg = await stream.finalMessage();
    const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    let suggestions: unknown;
    try {
      const s = raw.indexOf("["); const e = raw.lastIndexOf("]");
      suggestions = JSON.parse(raw.slice(s, e + 1));
    } catch { return json({ error: "parse_failed", raw }, 502); }

    return json({ suggestions });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
