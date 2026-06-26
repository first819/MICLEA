import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, getUserId } from "../_shared/clients.ts";
import { getTier, meets } from "../_shared/tier.ts";
import { anthropic, MODEL_FAST, loadUserContext } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const db = serviceClient();
    const tier = await getTier(db, userId);
    if (!meets(tier, "pro")) return json({ error: "upgrade_required", need: "pro" }, 403);

    const { question, answer, sessionId, questionId } = await req.json();
    if (!question || !answer) return json({ error: "missing question or answer" }, 400);

    const ctx = await loadUserContext(db, userId);
    const msg = await anthropic.messages.create({
      model: MODEL_FAST,
      max_tokens: 700,
      system:
        "You are Micl, an expert interview coach. Give concise, specific, encouraging " +
        "feedback on the candidate's answer. Tailor to their target role and known weak spots. " +
        "Return 2-4 sentences plus one concrete improvement. End with a score out of 10 as 'Score: N/10'.",
      messages: [{
        role: "user",
        content:
          `Target role: ${ctx.targetRole}\n` +
          `Known weak spots: ${ctx.weakSpots.join(", ") || "none recorded"}\n` +
          `Career stage: ${ctx.careerStage}\n\n` +
          `Question: ${question}\n\nCandidate's answer: ${answer}`,
      }],
    });

    const text = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const scoreMatch = text.match(/Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
    const score = scoreMatch ? Number(scoreMatch[1]) : null;

    if (sessionId) {
      await db.from("session_answers").insert({
        session_id: sessionId,
        question_id: questionId ?? null,
        answer_text: answer,
        feedback: text,
        score,
      });
    }
    return json({ feedback: text, score });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
