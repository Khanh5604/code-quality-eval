function explainQuality(meta) {
  const reasons = [];

  // 1. STYLE (Lint)
  if (meta.lintErrors === 0) {
    reasons.push({
      key: "style",
      level: "good",
      text: "Phong cách mã nguồn tốt: không phát hiện lỗi lint."
    });
  } else if (meta.lintErrors <= 5) {
    reasons.push({
      key: "style",
      level: "medium",
      text: `Phong cách ở mức trung bình (${meta.lintErrors} lỗi lint).`
    });
  } else {
    reasons.push({
      key: "style",
      level: "bad",
      text: `Phong cách kém (${meta.lintErrors} lỗi lint), cần xử lý sớm.`
    });
  }

  // 2. DUPLICATION
  if (meta.dupPercent === 0) {
    reasons.push({
      key: "duplication",
      level: "excellent",
      text: "Trùng lặp mã nguồn rất tốt (0%), cấu trúc gọn gàng."
    });
  } else if (meta.dupPercent <= 10) {
    reasons.push({
      key: "duplication",
      level: "good",
      text: `Trùng lặp thấp (${meta.dupPercent}%), nằm trong ngưỡng cho phép.`
    });
  } else if (meta.dupPercent <= 20) {
    reasons.push({
      key: "duplication",
      level: "medium",
      text: `Trùng lặp cao (${meta.dupPercent}%), nên refactor.`
    });
  } else {
    reasons.push({
      key: "duplication",
      level: "bad",
      text: `Trùng lặp rất cao (${meta.dupPercent}%), ảnh hưởng nghiêm trọng.`
    });
  }

  // 3. COMMENT
  if (meta.commentDensity >= 15) {
    reasons.push({
      key: "comment",
      level: "good",
      text: `Mật độ chú thích tốt (${meta.commentDensity}%).`
    });
  } else if (meta.commentDensity >= 10) {
    reasons.push({
      key: "comment",
      level: "medium",
      text: `Mật độ chú thích đạt (${meta.commentDensity}%).`
    });
  } else if (meta.commentDensity >= 5) {
    reasons.push({
      key: "comment",
      level: "low",
      text: `Mật độ chú thích thấp (${meta.commentDensity}%).`
    });
  } else {
    reasons.push({
      key: "comment",
      level: "bad",
      text: `Mật độ chú thích rất thấp (${meta.commentDensity}%), thiếu giải thích logic.`
    });
  }

  // 4. COMPLEXITY
  if (meta.complexityAvg <= 5) {
    reasons.push({
      key: "complexity",
      level: "good",
      text: "Độ phức tạp thấp, dễ kiểm thử."
    });
  } else if (meta.complexityAvg <= 10) {
    reasons.push({
      key: "complexity",
      level: "medium",
      text: "Độ phức tạp ở mức trung bình."
    });
  } else {
    reasons.push({
      key: "complexity",
      level: "bad",
      text: "Độ phức tạp cao, cần chia nhỏ hàm."
    });
  }

  // 5. FINAL NOTE
  reasons.push({
    key: "final",
    level: "info",
    text:
      "Điểm tổng thể được tính theo trọng số; chú thích và độ phức tạp có ảnh hưởng lớn đến khả năng bảo trì lâu dài."
  });
  

  return reasons;
  
}
function buildQualityDetail(meta) {
  const items = [];
  const weakKeys = [];

  // STYLE
  if (meta.lintErrors === 0) {
    items.push("Phong cách mã nguồn tốt: không phát hiện lỗi lint.");
  } else if (meta.lintErrors <= 5) {
    items.push(`Phong cách ở mức trung bình (${meta.lintErrors} lỗi lint).`);
    weakKeys.push("phong cách");
  } else {
    items.push(`Phong cách kém (${meta.lintErrors} lỗi lint), cần xử lý sớm.`);
    weakKeys.push("phong cách");
  }

  // DUPLICATION
  if (meta.dupPercent === 0) {
    items.push("Trùng lặp mã nguồn rất tốt (0%), cấu trúc gọn gàng.");
  } else if (meta.dupPercent <= 10) {
    items.push(`Trùng lặp thấp (${meta.dupPercent}%), nằm trong ngưỡng cho phép.`);
  } else if (meta.dupPercent <= 20) {
    items.push(`Trùng lặp cao (${meta.dupPercent}%), nên refactor.`);
    weakKeys.push("trùng lặp");
  } else {
    items.push(`Trùng lặp rất cao (${meta.dupPercent}%), ảnh hưởng nghiêm trọng.`);
    weakKeys.push("trùng lặp");
  }

  // COMMENT
  if (meta.commentDensity >= 15) {
    items.push(`Mật độ chú thích tốt (${meta.commentDensity}%).`);
  } else if (meta.commentDensity >= 10) {
    items.push(`Mật độ chú thích đạt (${meta.commentDensity}%).`);
  } else if (meta.commentDensity >= 5) {
    items.push(`Mật độ chú thích thấp (${meta.commentDensity}%), cần bổ sung.`);
    weakKeys.push("chú thích");
  } else {
    items.push(`Mật độ chú thích rất thấp (${meta.commentDensity}%), thiếu giải thích logic.`);
    weakKeys.push("chú thích");
  }

  // COMPLEXITY
  if (meta.complexityAvg <= 5) {
    items.push("Độ phức tạp thấp, dễ kiểm thử.");
  } else if (meta.complexityAvg <= 10) {
    items.push("Độ phức tạp ở mức trung bình.");
    weakKeys.push("độ phức tạp");
  } else {
    items.push("Độ phức tạp cao, cần chia nhỏ hàm.");
    weakKeys.push("độ phức tạp");
  }

  // KẾT LUẬN (→ …)
  let conclusion;
  if (weakKeys.length === 0) {
    conclusion = "Điểm cao vì tất cả tiêu chí quan trọng đều đạt tốt.";
  } else if (weakKeys.length <= 2) {
    conclusion = `Điểm bị giảm do ${[...new Set(weakKeys)].join(" và ")} chưa đạt.`;
  } else {
    conclusion = "Điểm thấp do nhiều tiêu chí quan trọng không đạt.";
  }

  return { items, conclusion };
}

module.exports = {
  explainQuality,
  buildQualityDetail
};

