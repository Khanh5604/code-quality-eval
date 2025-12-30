const { supabaseAdmin } = require("../db/supabase");
const { v4: uuid } = require("uuid");

async function getProjectsByUser(userId) {
  if (!userId) throw new Error("getProjectsByUser requires userId");

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, name, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(p => ({
    id: p.id,
    name: p.name}));
}

async function getProjectById(userId, projectId) {
  if (!userId || !projectId) return null;

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, name, description, language, created_at")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
    // .from("projects")
    // .select("id, name")
    // .eq("user_id", userId)
    // .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

async function createProject(userId, { name, description, language }) {
  if (!userId) throw new Error("createProject requires userId");
  if (!name) throw new Error("Project name is required");

  const project = {
    id: uuid(),
    user_id: userId,
    name,
    description: description || null,
    language: language || null
  };

  const { error } = await supabaseAdmin
    .from("projects")
    .insert(project);

  if (error) throw error;
  return project;
}


module.exports = {
  getProjectsByUser,
  getProjectById,
  createProject
};
