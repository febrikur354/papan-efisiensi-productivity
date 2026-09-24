const BIN = process.env.JSONBIN_BIN_ID;
const KEY = process.env.JSONBIN_ACCESS_KEY;

const BASE = `https://api.jsonbin.io/v3/b/${BIN}`;

async function readBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function jsonbin(method, body) {
  if (!BIN || !KEY) {
    throw new Error("Environment JSONBin belum lengkap.");
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const url =
      method === "GET"
        ? `${BASE}/latest`
        : BASE;

    const response = await fetch(url, {
      method,

      headers: {
        "X-Access-Key": KEY,
        "Content-Type": "application/json",
        "X-Bin-Versioning": "true"
      },

      ...(body !== undefined
        ? {
            body: JSON.stringify(body)
          }
        : {}),

      signal: controller.signal
    });

    const text = await response.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        `JSONBin error ${response.status}`
      );
    }

    return data.record ?? data;

  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  try {

    if (!BIN || !KEY) {
      return res.status(500).json({
        error: "Environment JSONBin belum lengkap."
      });
    }

    // ==========================
    // AMBIL DATA
    // ==========================

    if (req.method === "GET") {

      const data = await jsonbin("GET");

      return res.status(200).json(data);
    }

    // ==========================
    // SIMPAN DATA
    // ==========================

    if (req.method === "PUT" || req.method === "POST") {

      const body = await readBody(req);

      if (!body || !Array.isArray(body.lines)) {
        return res.status(400).json({
          error: "Format data harus { lines: [] }."
        });
      }

      if (body.lines.length > 500) {
        return res.status(400).json({
          error: "Maksimal 500 line."
        });
      }

      for (const x of body.lines) {

        if (
          !x.id ||
          !String(x.line || "").trim() ||
          !(Number(x.minutes) > 0) ||
          !(Number(x.stdCT) > 0) ||
          !(Number(x.actualCT) > 0)
        ) {

          return res.status(400).json({
            error: "Ada data line yang tidak valid."
          });

        }
      }

      const result = await jsonbin("PUT", {
        lines: body.lines
      });

      return res.status(200).json(result);
    }

    return res.status(405).json({
      error: "Method not allowed"
    });

  } catch (error) {

    console.error("PRODUCTIVITY ERROR:", error);

    if (error.name === "AbortError") {

      return res.status(504).json({
        error: "Koneksi ke JSONBin timeout."
      });

    }

    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
}
