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

    const { company, jobTitle, jobDescription = "" } = await req.json();
    if (!company || !jobTitle) return json({ error: "missing company or jobTitle" }, 400);

    const ctx = await loadUserContext(db, userId);
    const stream = anthropic.messages.stream({
      model: MODEL_DEEP,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      system:
        "You are Micl, an expert cover-letter writer. Write a tailored, specific, confident " +
        "cover letter grounded in the candidate's real résumé. Three to four short paragraphs. " +
        "No clichés, no invented facts. Return ONLY the letter text.",
      messages: [{
        role: "user",
        content:
          `Company: ${company}\nRole: ${jobTitle}\n` +
          (jobDescription ? `Job description:\n${jobDescription}\n` : "") +
          `\nCandidate résumé:\n${resumeSummary(ctx)}`,
      }],
    });

    const msg = await stream.finalMessage();
    const content = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("").trim();

    const ins = await db.from("cover_letters")
      .insert({ user_id: userId, job_title: jobTitle, company, content })
      .select("id").single();

    return json({ id: ins.data?.id, content });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
