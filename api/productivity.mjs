import crypto from "node:crypto";

const BIN = process.env.JSONBIN_BIN_ID;
const KEY = process.env.JSONBIN_ACCESS_KEY;

const BASE = `https://api.jsonbin.io/v3/b/${BIN}`;
const COOKIE = "prod_session";

function sign(value, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("base64url");
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";

  return Object.fromEntries(
    raw
      .split(";")
      .map(x => x.trim().split("="))
      .filter(x => x.length === 2)
  );
}

function isAdmin(req) {
  const secret = process.env.SESSION_SECRET;
  const cookies = parseCookies(req);
  const token = cookies[COOKIE];

  if (!secret || !token) return false;

  const [value, sig] = token.split(".");

  if (!value || !sig) return false;

  const expected = sign(value, secret);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

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

    // =========================
    // PUBLIC GET
    // =========================

    if (req.method === "GET") {
      const data = await jsonbin("GET");

      return res.status(200).json(data);
    }

    // =========================
    // ADMIN ONLY
    // =========================

    if (!["PUT", "POST"].includes(req.method)) {
      return res.status(405).json({
        error: "Method not allowed"
      });
    }

    if (!isAdmin(req)) {
      return res.status(401).json({
        error: "Login admin diperlukan."
      });
    }

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
