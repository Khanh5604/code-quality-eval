// tools/migrateScoringModel.js
// Script để cập nhật scoring_model cho các phân tích cũ trong database
require("dotenv").config();
const { supabaseAdmin } = require("../web/db/supabaseAdmin");

async function migrateScoringModel() {
  try {
    // Lấy tất cả các phân tích
    const { data: allAnalyses, error: allError } = await supabaseAdmin
      .from("analyses")
      .select("id, raw_scores");

    if (allError) {
      console.error("Error fetching analyses:", allError);
      return;
    }

    console.log(`Found ${allAnalyses.length} analyses to check`);

    let updated = 0;
    let skipped = 0;

    for (const analysis of allAnalyses) {
      const rawScores = analysis.raw_scores;
      if (!rawScores) {
        skipped++;
        continue;
      }

      // Kiểm tra xem đã có scoring_model chưa
      if (rawScores.scoring_model) {
        skipped++;
        continue;
      }

      // Tạo scoring_model từ weights
      const weights = rawScores.weights || {};
      const scoringModel = {
        style: {
          weight: weights.style || 0,
          basedOn: "Cấu hình người dùng"
        },
        complexity: {
          weight: weights.complexity || 0,
          basedOn: "Cấu hình người dùng"
        },
        duplication: {
          weight: weights.duplication || 0,
          basedOn: "Cấu hình người dùng"
        },
        comment: {
          weight: weights.comment || 0,
          basedOn: "Cấu hình người dùng"
        }
      };

      // Cập nhật raw_scores với scoring_model
      const updatedRawScores = {
        ...rawScores,
        scoring_model: scoringModel
      };

      const { error: updateError } = await supabaseAdmin
        .from("analyses")
        .update({ raw_scores: updatedRawScores })
        .eq("id", analysis.id);

      if (updateError) {
        console.error(`Error updating analysis ${analysis.id}:`, updateError);
      } else {
        updated++;
        console.log(`Updated analysis ${analysis.id}`);
      }
    }

    console.log(`\nMigration complete:`);
    console.log(`- Updated: ${updated}`);
    console.log(`- Skipped: ${skipped}`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateScoringModel()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateScoringModel };

