const BIN = process.env.JSONBIN_BIN_ID;
const KEY = process.env.JSONBIN_ACCESS_KEY;
const BASE = `https://api.jsonbin.io/v3/b/${BIN}`;

async function jsonbin(method, body) {
  const url = method === "GET" ? `${BASE}/latest` : BASE;

  const r = await fetch(url, {
    method,
    headers: {
      "X-Access-Key": KEY,
      "Content-Type": "application/json",
      "X-Bin-Versioning": "true"
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(j.message || j.error || `JSONBin error ${r.status}`);
  }

  return j.record ?? j;
}

export default async function handler(req) {

  if (!BIN || !KEY) {
    return Response.json(
      { error: "Environment JSONBin belum lengkap." },
      { status: 500 }
    );
  }

  try {

    // Baca data
    if (req.method === "GET") {
      return Response.json(await jsonbin("GET"));
    }

    // Simpan / update data
    if (req.method === "PUT") {

      const body = await req.json();

      if (!body || !Array.isArray(body.lines)) {
        return Response.json(
          { error: "Format data harus { lines: [] }." },
          { status: 400 }
        );
      }

      if (body.lines.length > 500) {
        return Response.json(
          { error: "Maksimal 500 line." },
          { status: 400 }
        );
      }

      for (const x of body.lines) {

        if (
          !x.id ||
          !String(x.line || "").trim() ||
          !(Number(x.minutes) > 0) ||
          !(Number(x.std) > 0) ||
          !(Number(x.actualCt) > 0) ||
          !(Number(x.qty) >= 0)
        ) {
          return Response.json(
            { error: "Ada data line yang tidak valid." },
            { status: 400 }
          );
        }
      }

      return Response.json(
        await jsonbin("PUT", { lines: body.lines })
      );
    }

    return Response.json(
      { error: "Method not allowed" },
      { status: 405 }
    );

  } catch (e) {

    return Response.json(
      { error: e.message || "Server error" },
      { status: 500 }
    );
  }
}
