import { extractText, getDocumentProxy } from "npm:unpdf";
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, getUserId } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const db = serviceClient();
    const { data: row } = await db.from("resumes").select("file_path").eq("user_id", userId).maybeSingle();
    if (!row?.file_path) return json({ error: "no_file" }, 404);

    const dl = await db.storage.from("resumes").download(row.file_path);
    if (dl.error || !dl.data) return json({ error: "download_failed" }, 500);

    let text = "";
    if (row.file_path.toLowerCase().endsWith(".pdf")) {
      const buf = new Uint8Array(await dl.data.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const res = await extractText(pdf, { mergePages: true });
      text = Array.isArray(res.text) ? res.text.join("\n") : res.text;
    } else {
      text = await dl.data.text(); // .txt / best-effort for .doc
    }

    await db.from("resumes").update({ file_text: text.slice(0, 20000) }).eq("user_id", userId);
    return json({ ok: true, chars: text.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
