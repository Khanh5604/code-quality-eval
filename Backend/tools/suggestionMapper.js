// tools/suggestionMapper.js

const eslintSuggestions = {
  "no-unused-vars": "Xoa bien khong su dung hoac su dung dung muc dich (Remove unused variable).",
  "no-console": "Loai bo console.log hoac thay bang logger phu hop (Avoid console in production).",
  eqeqeq: "Dung '===' thay cho '==' de tranh so sanh long (Use strict equality).",
  "no-var": "Thay var bang let/const de tranh hoisting khong mong muon (Use let/const).",
  "prefer-const": "Dung const cho bien khong thay doi (Prefer const for immutable bindings).",
  "no-shadow": "Doi ten bien de tranh trung pham vi (Avoid shadowed variables).",
  "no-undef": "Khai bao bien truoc khi su dung (Declare variables before use).",
  "no-debugger": "Xoa debugger truoc khi commit/deploy (Remove debugger statement)."
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
    if (match) return `Xoa bien '${match[1]}' khong su dung (Remove unused variable).`;
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
  F401: "Xoa import khong can thiet (Remove unused import).",
  E501: "Chia nho dong code de de doc va bao tri (Split long line).",
  C901: "Tach ham thanh cac ham nho hon (Refactor complex function).",
  B006: "Tranh dung mutable lam gia tri mac dinh (Avoid mutable default).",
  W293: "Xoa khoang trang du trong dong trong (Trim trailing whitespace).",
  F841: "Xoa bien khong su dung hoac su dung dung muc dich (Remove unused variable)."
};

function suggestionForRuff(issue) {
  const rule = issue.rule;
  const msg = issue.message || "";

  if (rule === "F401") {
    const match = /`(.+?)` imported but unused/.exec(msg);
    if (match) return `Xoa import '${match[1]}' neu khong dung.`;
  }

  if (rule === "F841") {
    const match = /'(.+?)' is assigned to but never used/.exec(msg);
    if (match) return `Xoa bien '${match[1]}' neu khong dung.`;
  }

  return ruffSuggestions[rule] || null;
}

const pmdSuggestions = {
  UnusedLocalVariable: "Xoa bien khong su dung hoac su dung dung muc dich (Remove unused local).",
  AvoidDuplicateLiterals: "Dua literal dung chung thanh hang so (Extract constant).",
  CyclomaticComplexity: "Chia nho phuong thuc de giam do phuc tap (Split complex method).",
  EmptyCatchBlock: "Them xu ly hoac log loi trong catch (Handle or log exception).",
  GodClass: "Tach lop thanh cac lop nho hon theo trach nhiem (Break down god class)."
};

function suggestionForPmd(rule) {
  return pmdSuggestions[rule] || null;
}

module.exports = {
  suggestionForEslint,
  suggestionForRuff,
  suggestionForPmd
};
