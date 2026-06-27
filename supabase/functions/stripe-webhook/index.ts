// Stripe webhook → grants/revokes user_tier.
// verify_jwt MUST be false (Stripe does not send a Supabase JWT); we authenticate
// the request by verifying Stripe's HMAC signature with STRIPE_WEBHOOK_SECRET.
//
// Tier resolution is authoritative when STRIPE_SECRET_KEY is set: we retrieve the
// purchased line item and read the tier from the price/product (metadata.tier, or
// the product name containing "ultra"/"pro"). This can't be spoofed via the URL.
// Without the key, we fall back to the tier carried in client_reference_id.
import { serviceClient } from "../_shared/clients.ts";

const WHSEC = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SK = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

async function verifySignature(rawBody: string, sigHeader: string): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const kv of sigHeader.split(",")) {
    const i = kv.indexOf("=");
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const t = parts["t"], v1 = parts["v1"];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(WHSEC), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${rawBody}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

function tierFromString(s: string): "pro" | "ultra" | null {
  const v = (s || "").toLowerCase();
  if (v.includes("ultra")) return "ultra";
  if (v.includes("pro")) return "pro";
  return null;
}

// Authoritative tier: ask Stripe what was actually purchased.
async function tierFromStripe(sessionId: string): Promise<"pro" | "ultra" | null> {
  if (!SK || !sessionId) return null;
  try {
    const resp = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items?expand[]=data.price.product`,
      { headers: { Authorization: `Bearer ${SK}` } },
    );
    if (!resp.ok) return null;
    const body = await resp.json();
    for (const item of (body.data ?? [])) {
      const price = item.price ?? {};
      const product = price.product ?? {};
      const meta = (price.metadata?.tier ?? product.metadata?.tier ?? "") as string;
      const fromMeta = tierFromString(meta);
      if (fromMeta) return fromMeta;
      const fromName = tierFromString(product.name ?? "");
      if (fromName) return fromName;
    }
  } catch (_) { /* fall through to fallback */ }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();
  if (!(await verifySignature(raw, sig))) {
    return new Response("invalid signature", { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try { event = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  const db = serviceClient();
  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as { id?: string; client_reference_id?: string; customer?: string };
      const ref = s.client_reference_id ?? "";
      const sep = ref.lastIndexOf("__");
      const uid = sep > 0 ? ref.slice(0, sep) : ref;
      const claimed = sep > 0 ? tierFromString(ref.slice(sep + 2)) : null;

      // Prefer the authoritative tier from Stripe; fall back to the URL-carried tier.
      const tier = (await tierFromStripe(s.id ?? "")) ?? claimed;

      if (uid && (tier === "pro" || tier === "ultra")) {
        await db.from("user_tier").upsert(
          { user_id: uid, tier, stripe_customer_id: s.customer ?? null, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as { customer?: string };
      if (sub.customer) {
        await db.from("user_tier")
          .update({ tier: "free", updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", sub.customer);
      }
    }
  } catch (e) {
    return new Response("error: " + String(e), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
