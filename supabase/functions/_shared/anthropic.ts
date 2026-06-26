import Anthropic from "npm:@anthropic-ai/sdk";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

export const MODEL_FAST = "claude-sonnet-4-6";   // questions, feedback, research
export const MODEL_DEEP = "claude-opus-4-8";     // résumé, cover letter

// Loads the personalization context the prompts need for one user.
export async function loadUserContext(db: SupabaseClient, userId: string) {
  const [onb, resume] = await Promise.all([
    db.from("onboarding_answers").select("*").eq("user_id", userId).maybeSingle(),
    db.from("resumes").select("fields, file_text").eq("user_id", userId).maybeSingle(),
  ]);
  const o = onb.data ?? {};
  const r = resume.data ?? {};
  return {
    targetRole: (o.target_roles?.[0] as string) ?? "the target role",
    targetRoles: (o.target_roles as string[]) ?? [],
    weakSpots: [...(o.pain_points ?? []), ...(o.practice_focus ?? [])] as string[],
    careerStage: (o.career_stage as string) ?? "unspecified",
    timeline: (o.interview_timeline as string) ?? "unspecified",
    resumeFields: (r.fields as Record<string, unknown>) ?? {},
    resumeText: (r.file_text as string) ?? "",
  };
}

// Compact, prompt-ready summary of the résumé (structured fields preferred,
// uploaded text as fallback).
export function resumeSummary(
  ctx: { resumeFields: Record<string, unknown>; resumeText: string },
): string {
  const f = ctx.resumeFields;
  if (f && Object.keys(f).length) {
    return [
      `Title: ${f.title ?? ""}`,
      `Summary: ${f.summary ?? ""}`,
      `Experience: ${f.role ?? ""} at ${f.company ?? ""} (${f.dates ?? ""}) — ${f.b0 ?? ""} ${f.b1 ?? ""}`,
      `Skills: ${f.skills ?? ""}`,
    ].join("\n");
  }
  return ctx.resumeText?.slice(0, 4000) || "(no résumé on file)";
}
