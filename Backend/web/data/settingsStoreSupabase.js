/* eslint-disable no-console */
const { supabaseAdmin } = require("../db/supabaseAdmin");
const { DEFAULT_WEIGHTS, resolveWeights } = require("../../tools/scorer");

const TABLE = "user_settings";

async function getWeights(userId) {
  if (!userId) throw new Error("getWeights requires authenticated userId");

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("weights")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return { ...DEFAULT_WEIGHTS };
    console.warn("Load settings failed, using defaults:", error.message);
    return { ...DEFAULT_WEIGHTS };
  }

  return resolveWeights(data?.weights || DEFAULT_WEIGHTS);
}

async function upsertWeights(userId, weights) {
  if (!userId) throw new Error("upsertWeights requires authenticated userId");

  const normalized = resolveWeights(weights);

  const { error } = await supabaseAdmin.from(TABLE).upsert({
    user_id: userId,
    weights: normalized,
    updated_at: new Date().toISOString()
  });

  if (error) throw error;

  return normalized;
}

module.exports = { getWeights, upsertWeights, DEFAULT_WEIGHTS };
