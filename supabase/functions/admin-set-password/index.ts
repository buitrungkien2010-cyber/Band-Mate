// Admin tao / dat lai mat khau cho thanh vien dang nhap bang username.
// service_role chi nam o server (bien moi truong cua Edge Function), khong bao gio o giao dien.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Client mang quyen cua nguoi goi -> RLS + is_admin() quyet dinh
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: isAdmin, error: adminErr } = await caller.rpc("is_admin");
  if (adminErr || isAdmin !== true) return json({ error: "forbidden" }, 403);

  let body: { member_id?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const { member_id, password } = body;
  if (!member_id || typeof password !== "string" || password.length < 8) {
    return json({ error: "password_min_8" }, 400);
  }

  // Chi thay duoc thanh vien cung band (RLS loc)
  const { data: m, error: mErr } = await caller
    .from("members").select("id, username, login_user_id, is_active")
    .eq("id", member_id).maybeSingle();
  if (mErr || !m) return json({ error: "member_not_found" }, 404);
  if (!m.username || !m.is_active) return json({ error: "no_username" }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  if (m.login_user_id) {
    const { error } = await admin.auth.admin.updateUserById(m.login_user_id, { password });
    if (error) return json({ error: error.message }, 400);
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: `${m.username.toLowerCase()}@tamband.local`,
      password,
      email_confirm: true,
    });
    if (error) return json({ error: error.message }, 400);
  }
  return json({ ok: true });
});
