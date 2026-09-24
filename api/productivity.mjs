const BIN = process.env.JSONBIN_BIN_ID;
const KEY = process.env.JSONBIN_ACCESS_KEY;
const BASE = `https://api.jsonbin.io/v3/b/${BIN}`;

function parseCookies(req) {
  const raw = req.headers.get("cookie") || "";
  return Object.fromEntries(raw.split(";").map(x => x.trim().split("=")).filter(x => x.length === 2));
}
async function isAdmin(req) {
  const r = await fetch(new URL("/api/auth", req.url), {headers:{cookie:req.headers.get("cookie")||""}});
  const j = await r.json().catch(()=>({}));
  return j.authorized === true;
}
async function jsonbin(method, body) {
  const r = await fetch(method === "GET" ? `${BASE}/latest` : BASE, {
    method, headers: {"X-Access-Key": KEY, "Content-Type":"application/json", "X-Bin-Versioning":"true"},
    ...(body ? {body: JSON.stringify(body)} : {})
  });
  const j = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(j.message || j.error || `JSONBin error ${r.status}`);
  return j.record ?? j;
}
export default async function handler(req) {
  if (!BIN || !KEY) return Response.json({error:"Environment JSONBin belum lengkap."},{status:500});
  try {
    if (req.method === "GET") return Response.json(await jsonbin("GET"));
    if (!["PUT","POST"].includes(req.method)) return Response.json({error:"Method not allowed"},{status:405});
    if (!(await isAdmin(req))) return Response.json({error:"Login admin diperlukan."},{status:401});
    const body = await req.json();
    if (!body || !Array.isArray(body.lines)) return Response.json({error:"Format data harus { lines: [] }."},{status:400});
    if (body.lines.length > 500) return Response.json({error:"Maksimal 500 line."},{status:400});
    for (const x of body.lines) {
      if (!x.id || !String(x.line||"").trim() || !(Number(x.minutes)>0) || !(Number(x.std)>0) || !(Number(x.actualCt)>0) || Number(x.qty)<0)
        return Response.json({error:"Ada data line yang tidak valid."},{status:400});
    }
    return Response.json(await jsonbin("PUT", {lines:body.lines}));
  } catch (e) {
    return Response.json({error:e.message || "Server error"},{status:500});
  }
}