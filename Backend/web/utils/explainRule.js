const ruleExplanations = {
  "no-unused-vars": {
    description: "Biến được khai báo nhưng không sử dụng.",
    impact: "Làm mã rối và tăng nợ kỹ thuật.",
    suggestion: "Xóa biến hoặc sử dụng đúng mục đích."
  },
  "no-console": {
    description: "console.log còn sót trong mã ứng dụng.",
    impact: "Có thể rò rỉ log nhạy cảm hoặc làm nhiễu logging.",
    suggestion: "Loại bỏ hoặc thay bằng logger có mức log phù hợp."
  },
  eqeqeq: {
    description: "So sánh lỏng bằng == thay vì ===.",
    impact: "Dễ gây lỗi logic do ép kiểu ngầm.",
    suggestion: "Dùng === và !== để so sánh."
  },
  "no-var": {
    description: "Sử dụng var thay vì let/const.",
    impact: "Hoisting khó kiểm soát, dễ sinh bug.",
    suggestion: "Đổi sang let/const."
  },
  "prefer-const": {
    description: "Biến không đổi nhưng khai báo let.",
    impact: "Giảm tính rõ ràng về bất biến.",
    suggestion: "Dùng const cho biến không thay đổi."
  },
  "no-shadow": {
    description: "Biến trùng tên che khuất biến ngoài.",
    impact: "Gây nhầm lẫn phạm vi và lỗi logic.",
    suggestion: "Đổi tên biến để tránh che khuất."
  },
  "no-undef": {
    description: "Biến dùng trước khi khai báo.",
    impact: "Có thể crash ở runtime hoặc sai kết quả.",
    suggestion: "Khai báo biến/nhập module trước khi dùng."
  },
  "no-debugger": {
    description: "Còn lệnh debugger trong mã.",
    impact: "Dừng thực thi ngoài ý muốn khi chạy production.",
    suggestion: "Loại bỏ debugger trước khi commit."
  },
  complexity: {
    description: "Hàm có độ phức tạp chu trình cao.",
    impact: "Khó đọc, khó test, tăng rủi ro bug.",
    suggestion: "Tách hàm nhỏ hơn, giảm nhánh if/switch."
  }
};

function defaultImpact(rule = "") {
  const key = rule.toLowerCase();
  if (key.includes("unused")) return "Giảm rõ ràng mã, tăng nợ kỹ thuật.";
  if (key.includes("console")) return "Log thừa dễ lọt vào production.";
  if (key.includes("complex")) return "Độ phức tạp cao, khó bảo trì.";
  if (key.includes("duplicate")) return "Trùng lặp làm tăng chi phí bảo trì.";
  if (key.includes("style")) return "Không tuân thủ style guide, kém nhất quán.";
  return "Ảnh hưởng chất lượng và khả năng bảo trì.";
}

function explainRule(ruleId = "") {
  const key = String(ruleId || "").toLowerCase();
  const found = ruleExplanations[key];
  if (found) return found;
  return {
    description: "Vi phạm quy tắc chất lượng mã.",
    impact: defaultImpact(key),
    suggestion: "Kiểm tra rule và chỉnh sửa theo khuyến nghị lint."
  };
}

module.exports = { explainRule, defaultImpact };
