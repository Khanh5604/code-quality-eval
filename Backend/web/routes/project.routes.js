const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const projectStore = require("../data/projectStoreSupabase");
const { supabaseAdmin } = require("../db/supabase");

const router = express.Router();

/* =========================
   GET /api/projects/:projectId/versions
   (KHÔNG đổi – versions vẫn tồn tại)
========================= */
router.get("/:projectId/versions", requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("versions")
      .select("id, label, source_hash")
      .eq("project_id", projectId);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load versions",
      error: err.message
    });
  }
});

/* =========================
   GET /api/projects
   (CHỈ LẤY PROJECT CHƯA BỊ XÓA)
========================= */
router.get("/", requireAuth, async (req, res) => {
  try {
    const projects = await projectStore.getProjectsByUser(req.user.id);
    res.json(projects);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load projects",
      error: err.message
    });
  }
});

/* =========================
   POST /api/projects
========================= */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const project = await projectStore.createProject(req.user.id, {
      name,
      description
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* =========================
   DELETE /api/projects/:projectId
   👉 SOFT DELETE (CÁCH 2)
========================= */
router.delete("/:projectId", requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    // 1️⃣ Kiểm tra project tồn tại & thuộc user & CHƯA bị xóa
    const { data: project, error: findErr } = await supabaseAdmin
      .from("projects")
      .select("id, name, is_deleted")
      .eq("id", projectId)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (findErr) throw findErr;

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.is_deleted) {
      return res.status(400).json({ message: "Project already deleted" });
    }

    // 2️⃣ SOFT DELETE: chỉ cập nhật cờ
    const { error: updateErr } = await supabaseAdmin
      .from("projects")
      .update({ is_deleted: true })
      .eq("id", projectId)
      .eq("user_id", req.user.id);

    if (updateErr) throw updateErr;

    return res.json({
      success: true,
      deletedProject: {
        id: project.id,
        name: project.name
      }
    });
  } catch (err) {
    return res.status(500).json({
      message: "Soft delete project failed",
      error: err.message
    });
  }
});

module.exports = router;
