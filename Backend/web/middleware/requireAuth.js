const { supabaseAuth } = require("../db/supabase");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) return res.status(401).json({ message: "Missing access token" });

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ message: "Invalid access token" });
    }

    req.user = data.user; // req.user.id
    next();
  } catch (err) {
    const msg = err?.message || String(err);
    process.stderr.write(`Auth middleware failed: ${msg}\n`);
    return res.status(500).json({ message: "Auth middleware failed" });
  }
}

module.exports = { requireAuth };
