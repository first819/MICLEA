// Stripe webhook → grants/revokes user_tier.
// verify_jwt MUST be false (Stripe does not send a Supabase JWT); we authenticate
// the request by verifying Stripe's HMAC signature with STRIPE_WEBHOOK_SECRET.
import { serviceClient } from "../_shared/clients.ts";

const WHSEC = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// Verify the Stripe-Signature header: t=timestamp,v1=hexHMAC(`${t}.${rawBody}`)
async function verifySignature(rawBody: string, sigHeader: string): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const kv of sigHeader.split(",")) {
    const i = kv.indexOf("=");
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const t = parts["t"], v1 = parts["v1"];
  if (!t || !v1) return false;
  // Reject events older than 5 minutes (replay protection)
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
      const s = event.data.object as { client_reference_id?: string; customer?: string };
      const ref = s.client_reference_id ?? "";
      const sep = ref.lastIndexOf("__");
      const uid = sep > 0 ? ref.slice(0, sep) : "";
      const tier = sep > 0 ? ref.slice(sep + 2) : "";
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
