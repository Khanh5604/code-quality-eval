function explainQuality(meta) {
  const reasons = [];
  reasons.push(getStyleReason(meta.lintErrors));
  reasons.push(getDuplicationReason(meta.dupPercent));
  reasons.push(getCommentReason(meta.commentDensity));
  reasons.push(getComplexityReason(meta.complexityAvg));
  reasons.push(getFinalReason());
  return reasons;
}

function getStyleReason(lintErrors) {
  if (lintErrors === 0) {
    return { key: "style", level: "good", text: "Phong cách mã nguồn tốt: không phát hiện lỗi lint." };
  } else if (lintErrors <= 5) {
    return { key: "style", level: "medium", text: `Phong cách ở mức trung bình (${lintErrors} lỗi lint).` };
  } else {
    return { key: "style", level: "bad", text: `Phong cách kém (${lintErrors} lỗi lint), cần xử lý sớm.` };
  }
}
function getDuplicationReason(dupPercent) {
  if (dupPercent === 0) {
    return { key: "duplication", level: "excellent", text: "Trùng lặp mã nguồn rất tốt (0%), cấu trúc gọn gàng." };
  } else if (dupPercent <= 10) {
    return { key: "duplication", level: "good", text: `Trùng lặp thấp (${dupPercent}%), nằm trong ngưỡng cho phép.` };
  } else if (dupPercent <= 20) {
    return { key: "duplication", level: "medium", text: `Trùng lặp cao (${dupPercent}%), nên refactor.` };
  } else {
    return { key: "duplication", level: "bad", text: `Trùng lặp rất cao (${dupPercent}%), ảnh hưởng nghiêm trọng.` };
  }
}
function getCommentReason(commentDensity) {
  if (commentDensity >= 15) {
    return { key: "comment", level: "good", text: `Mật độ chú thích tốt (${commentDensity}%).` };
  } else if (commentDensity >= 10) {
    return { key: "comment", level: "medium", text: `Mật độ chú thích đạt (${commentDensity}%).` };
  } else if (commentDensity >= 5) {
    return { key: "comment", level: "low", text: `Mật độ chú thích thấp (${commentDensity}%).` };
  } else {
    return { key: "comment", level: "bad", text: `Mật độ chú thích rất thấp (${commentDensity}%), thiếu giải thích logic.` };
  }
}
function getComplexityReason(complexityAvg) {
  if (complexityAvg <= 5) {
    return { key: "complexity", level: "good", text: "Độ phức tạp thấp, dễ kiểm thử." };
  } else if (complexityAvg <= 10) {
    return { key: "complexity", level: "medium", text: "Độ phức tạp ở mức trung bình." };
  } else {
    return { key: "complexity", level: "bad", text: "Độ phức tạp cao, cần chia nhỏ hàm." };
  }
}
function getFinalReason() {
  return {
    key: "final",
    level: "info",
    text: "Điểm tổng thể được tính theo trọng số; chú thích và độ phức tạp có ảnh hưởng lớn đến khả năng bảo trì lâu dài."
  };
}
function buildQualityDetail(meta) {
  const items = [];
  const weakKeys = [];
  addStyleDetail(meta.lintErrors, items, weakKeys);
  addDuplicationDetail(meta.dupPercent, items, weakKeys);
  addCommentDetail(meta.commentDensity, items, weakKeys);
  addComplexityDetail(meta.complexityAvg, items, weakKeys);
  const conclusion = buildConclusion(weakKeys);
  return { items, conclusion };
}

function addStyleDetail(lintErrors, items, weakKeys) {
  if (lintErrors === 0) {
    items.push("Phong cách mã nguồn tốt: không phát hiện lỗi lint.");
  } else if (lintErrors <= 5) {
    items.push(`Phong cách ở mức trung bình (${lintErrors} lỗi lint).`);
    weakKeys.push("phong cách");
  } else {
    items.push(`Phong cách kém (${lintErrors} lỗi lint), cần xử lý sớm.`);
    weakKeys.push("phong cách");
  }
}
function addDuplicationDetail(dupPercent, items, weakKeys) {
  if (dupPercent === 0) {
    items.push("Trùng lặp mã nguồn rất tốt (0%), cấu trúc gọn gàng.");
  } else if (dupPercent <= 10) {
    items.push(`Trùng lặp thấp (${dupPercent}%), nằm trong ngưỡng cho phép.`);
  } else if (dupPercent <= 20) {
    items.push(`Trùng lặp cao (${dupPercent}%), nên refactor.`);
    weakKeys.push("trùng lặp");
  } else {
    items.push(`Trùng lặp rất cao (${dupPercent}%), ảnh hưởng nghiêm trọng.`);
    weakKeys.push("trùng lặp");
  }
}
function addCommentDetail(commentDensity, items, weakKeys) {
  if (commentDensity >= 15) {
    items.push(`Mật độ chú thích tốt (${commentDensity}%).`);
  } else if (commentDensity >= 10) {
    items.push(`Mật độ chú thích đạt (${commentDensity}%).`);
  } else if (commentDensity >= 5) {
    items.push(`Mật độ chú thích thấp (${commentDensity}%), cần bổ sung.`);
    weakKeys.push("chú thích");
  } else {
    items.push(`Mật độ chú thích rất thấp (${commentDensity}%), thiếu giải thích logic.`);
    weakKeys.push("chú thích");
  }
}
function addComplexityDetail(complexityAvg, items, weakKeys) {
  if (complexityAvg <= 5) {
    items.push("Độ phức tạp thấp, dễ kiểm thử.");
  } else if (complexityAvg <= 10) {
    items.push("Độ phức tạp ở mức trung bình.");
    weakKeys.push("độ phức tạp");
  } else {
    items.push("Độ phức tạp cao, cần chia nhỏ hàm.");
    weakKeys.push("độ phức tạp");
  }
}
function buildConclusion(weakKeys) {
  if (weakKeys.length === 0) {
    return "Điểm cao vì tất cả tiêu chí quan trọng đều đạt tốt.";
  } else if (weakKeys.length <= 2) {
    return `Điểm bị giảm do ${[...new Set(weakKeys)].join(" và ")} chưa đạt.`;
  } else {
    return "Điểm thấp do nhiều tiêu chí quan trọng không đạt.";
  }
}

module.exports = {
  explainQuality,
  buildQualityDetail
};

