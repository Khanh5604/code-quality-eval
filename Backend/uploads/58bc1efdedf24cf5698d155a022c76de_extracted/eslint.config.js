// eslint.config.js (Flat config for ESLint v9+)
// Intentionally strict-ish to make findings obvious.
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-undef": "error",
      "no-console": "warn",
      "eqeqeq": "error",
      // Optional: if your pipeline enables it, you'll see complexity findings.
      "complexity": ["warn", 5],
    },
  },
];
