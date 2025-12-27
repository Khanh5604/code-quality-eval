// tools/suggestionMapper.js

const eslintSuggestions = {
  "no-unused-vars": "Xóa biến không sử dụng hoặc sử dụng đúng mục đích (Remove unused variable).",
  "no-console": "Loại bỏ console.log hoặc thay bằng logger phù hợp (Avoid console in production).",
  eqeqeq: "Dùng '===' thay cho '==' để tránh so sánh lỏng (Use strict equality).",
  "no-var": "Thay var bằng let/const để tránh hoisting không mong muốn (Use let/const).",
  "prefer-const": "Dùng const cho biến không thay đổi (Prefer const for immutable bindings).",
  "no-shadow": "Đổi tên biến để tránh trùng phạm vi (Avoid shadowed variables).",
  "no-undef": "Khai báo biến trước khi sử dụng (Declare variables before use).",
  "no-debugger": "Xóa debugger trước khi commit/deploy (Remove debugger statement)."
};

/**
 * Goi y sua loi cho 1 message ESLint (JS).
 * message: 1 object trong file.messages cua ESLint.
 */
function suggestionForEslint(message) {
  const ruleId = message.ruleId;
  const msg = message.message || "";

  // Give localized guidance first so UI is always bilingual.
  if (ruleId === "no-unused-vars") {
    const match = /'(.+?)' is assigned a value but never used/.exec(msg);
    if (match) return `Xóa biến '${match[1]}' không sử dụng (Remove unused variable).`;
  }

  if (eslintSuggestions[ruleId]) return eslintSuggestions[ruleId];

  if (message.suggestions && message.suggestions.length > 0) {
    const s = message.suggestions[0];
    if (s.desc) return s.desc;
  }

  return null;
}

/**
 * Gợi ý sửa lỗi cho 1 issue Ruff (Python).
 * issue: { rule: 'F401' | 'F841' | ..., message: string }
 */
const ruffSuggestions = {
  F401: "Xóa import không cần thiết (Remove unused import).",
  E501: "Chia nhỏ dòng code để dễ đọc và bảo trì (Split long line).",
  C901: "Tách hàm thành các hàm nhỏ hơn (Refactor complex function).",
  B006: "Tránh dùng mutable làm giá trị mặc định (Avoid mutable default).",
  W293: "Xóa khoảng trắng dư trong dòng trống (Trim trailing whitespace).",
  F841: "Xóa biến không sử dụng hoặc sử dụng đúng mục đích (Remove unused variable)."
};

function suggestionForRuff(issue) {
  const rule = issue.rule;
  const msg = issue.message || "";

  if (rule === "F401") {
    const match = /`(.+?)` imported but unused/.exec(msg);
    if (match) return `Xóa import '${match[1]}' nếu không dùng.`;
  }

  if (rule === "F841") {
    const match = /'(.+?)' is assigned to but never used/.exec(msg);
    if (match) return `Xóa biến '${match[1]}' nếu không dùng.`;
  }

  return ruffSuggestions[rule] || null;
}

const pmdSuggestions = {
  UnusedLocalVariable: "Xóa biến không sử dụng hoặc sử dụng đúng mục đích (Remove unused local).",
  AvoidDuplicateLiterals: "Đưa literal dùng chung thành hằng số (Extract constant).",
  CyclomaticComplexity: "Chia nhỏ phương thức để giảm độ phức tạp (Split complex method).",
  EmptyCatchBlock: "Thêm xử lý hoặc log lỗi trong catch (Handle or log exception).",
  GodClass: "Tách lớp thành các lớp nhỏ hơn theo trách nhiệm (Break down god class)."
};

function suggestionForPmd(rule) {
  return pmdSuggestions[rule] || null;
}

module.exports = {
  suggestionForEslint,
  suggestionForRuff,
  suggestionForPmd
};
