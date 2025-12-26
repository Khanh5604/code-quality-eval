const { createClient } = require("@supabase/supabase-js");

const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Client dùng để ghi DB (bypass RLS). Chỉ dùng ở backend.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabaseAuth, supabaseAdmin };
