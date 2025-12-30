// tools/config/eslint.base.config.js
import js from "@eslint/js";

export default [
  js.configs.recommended,

  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      // 🔴 Phong cách / lỗi nghiêm trọng
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-redeclare": "error",

      // 🟠 Best practice
      "no-console": "warn",
      "eqeqeq": "warn",
      "no-var": "warn",
      "prefer-const": "warn",

      // 🟡 Độ phức tạp
      "complexity": ["warn", 5]
    }
  }
];
