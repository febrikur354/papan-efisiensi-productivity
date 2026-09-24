import crypto from "node:crypto";

const COOKIE = "prod_session";
function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}
function parseCookies(req) {
  const raw = req.headers.get("cookie") || "";
  return Object.fromEntries(raw.split(";").map(x => x.trim().split("=")).filter(x => x.length === 2));
}
function authorized(req) {
  const secret = process.env.SESSION_SECRET;
  const c = parseCookies(req)[COOKIE];
  if (!secret || !c) return false;
  const [value, sig] = c.split(".");
  return !!value && !!sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(value, secret)));
}
export default async function handler(req) {
  const method = req.method;
  if (method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD)
      return Response.json({error:"Password salah."},{status:401});
    const value = `${Date.now()}.${crypto.randomBytes(12).toString("hex")}`;
    const token = `${value}.${sign(value, process.env.SESSION_SECRET || "missing-secret")}`;
    return new Response(JSON.stringify({ok:true}), {
      status:200, headers:{
        "Content-Type":"application/json",
        "Set-Cookie":`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`
      }
    });
  }
  if (method === "DELETE") {
    return new Response(JSON.stringify({ok:true}), {status:200,headers:{
      "Content-Type":"application/json","Set-Cookie":`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
    }});
  }
  if (method === "GET") return Response.json({authorized:authorized(req)});
  return Response.json({error:"Method not allowed"},{status:405});
}