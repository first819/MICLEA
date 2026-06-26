import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, getUserId } from "../_shared/clients.ts";
import { getTier, meets } from "../_shared/tier.ts";
import { anthropic, MODEL_FAST } from "../_shared/anthropic.ts";

async function tavily(query: string) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: Deno.env.get("TAVILY_API_KEY"),
      query,
      search_depth: "advanced",
      max_results: 6,
    }),
  });
  if (!res.ok) throw new Error(`tavily ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r: { title: string; url: string; content: string }) =>
    `- ${r.title} (${r.url})\n  ${r.content}`).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const db = serviceClient();
    const tier = await getTier(db, userId);
    if (!meets(tier, "pro")) return json({ error: "upgrade_required", need: "pro" }, 403);

    const { company, role = null } = await req.json();
    if (!company) return json({ error: "missing company" }, 400);

    const sources = await tavily(`${company} company interview process culture recent news ${role ?? ""}`);

    const msg = await anthropic.messages.create({
      model: MODEL_FAST,
      max_tokens: 1500,
      system:
        "You are Micl, an interview research analyst. Using ONLY the provided web sources, " +
        "produce a company prep pack. Return JSON with keys: " +
        `{"overview": string, "culture": string, "recent_news": string[], ` +
        `"interview_process": string, "likely_questions": string[], "talking_points": string[]}. No prose.`,
      messages: [{
        role: "user",
        content: `Company: ${company}\nRole: ${role ?? "general"}\n\nWeb sources:\n${sources}`,
      }],
    });

    const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    let pack: Record<string, unknown>;
    try {
      const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
      pack = JSON.parse(raw.slice(s, e + 1));
    } catch { return json({ error: "parse_failed", raw }, 502); }

    const ins = await db.from("company_packs")
      .insert({ user_id: userId, company, industry: role, research_json: pack })
      .select("id").single();

    return json({ id: ins.data?.id, pack });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
