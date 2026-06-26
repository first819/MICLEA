import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, getUserId } from "../_shared/clients.ts";
import { getTier, meets } from "../_shared/tier.ts";
import { anthropic, MODEL_FAST, loadUserContext, resumeSummary } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const db = serviceClient();
    const tier = await getTier(db, userId);
    if (!meets(tier, "pro")) return json({ error: "upgrade_required", need: "pro" }, 403);

    const { count = 5, mode = "speed", topic = null } = await req.json().catch(() => ({}));
    const n = Math.min(Math.max(Number(count) || 5, 1), 15);
    const ctx = await loadUserContext(db, userId);

    const msg = await anthropic.messages.create({
      model: MODEL_FAST,
      max_tokens: 1200,
      system:
        "You are Micl, an interview-prep question generator. Produce realistic interview " +
        "questions tailored to the candidate's target role, résumé, and weak spots. " +
        "Return ONLY a JSON array of objects: " +
        `[{"content": string, "topic": string, "difficulty": "easy"|"medium"|"hard"}]. No prose.`,
      messages: [{
        role: "user",
        content:
          `Generate ${n} ${mode === "gauntlet" ? "challenging, multi-part" : "varied"} questions.\n` +
          `Target role: ${ctx.targetRole}\n` +
          `Weak spots to target: ${ctx.weakSpots.join(", ") || "general interview skills"}\n` +
          (topic ? `Focus topic: ${topic}\n` : "") +
          `Candidate résumé:\n${resumeSummary(ctx)}`,
      }],
    });

    const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    let items: { content: string; topic?: string; difficulty?: string }[] = [];
    try {
      const start = raw.indexOf("["); const end = raw.lastIndexOf("]");
      items = JSON.parse(raw.slice(start, end + 1));
    } catch { return json({ error: "parse_failed", raw }, 502); }

    const rows = items.map((q) => ({
      user_id: userId,
      content: q.content,
      role: ctx.targetRole,
      topic: q.topic ?? topic ?? null,
      difficulty: ["easy", "medium", "hard"].includes(q.difficulty ?? "") ? q.difficulty : "medium",
      source: "ai",
    }));
    const ins = await db.from("question_bank").insert(rows).select("id, content, topic, difficulty");
    if (ins.error) return json({ error: ins.error.message }, 500);

    return json({ questions: ins.data });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
