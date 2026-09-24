import crypto from "node:crypto";

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

function authorized(req) {
  const secret = process.env.SESSION_SECRET;
  const cookies = parseCookies(req);
  const token = cookies[COOKIE];

  if (!secret || !token) return false;

  const [value, sig] = token.split(".");

  if (!value || !sig) return false;

  const expected = sign(value, secret);

  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expected)
  );
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

export default async function handler(req, res) {
  try {
    // CEK SESSION
    if (req.method === "GET") {
      return res.status(200).json({
        authorized: authorized(req)
      });
    }

    // LOGIN
    if (req.method === "POST") {
      const body = await readBody(req);

      if (
        !process.env.ADMIN_PASSWORD ||
        body.password !== process.env.ADMIN_PASSWORD
      ) {
        return res.status(401).json({
          error: "Password salah."
        });
      }

      const value = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}`;

      const secret = process.env.SESSION_SECRET;

      if (!secret) {
        return res.status(500).json({
          error: "SESSION_SECRET belum tersedia."
        });
      }

      const token = `${value}.${sign(value, secret)}`;

      res.setHeader(
        "Set-Cookie",
        `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`
      );

      return res.status(200).json({
        ok: true
      });
    }

    // LOGOUT
    if (req.method === "DELETE") {
      res.setHeader(
        "Set-Cookie",
        `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
      );

      return res.status(200).json({
        ok: true
      });
    }

    return res.status(405).json({
      error: "Method not allowed"
    });

  } catch (error) {
    console.error("AUTH ERROR:", error);

    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
}
