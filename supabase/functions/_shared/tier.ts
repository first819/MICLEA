import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type Tier = "free" | "pro" | "ultra";
const RANK: Record<Tier, number> = { free: 0, pro: 1, ultra: 2 };

export async function getTier(db: SupabaseClient, userId: string): Promise<Tier> {
  const { data } = await db
    .from("user_tier")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.tier as Tier) ?? "free";
}

// Returns true if the user's tier meets or exceeds `required`.
export function meets(tier: Tier, required: Tier): boolean {
  return RANK[tier] >= RANK[required];
}
