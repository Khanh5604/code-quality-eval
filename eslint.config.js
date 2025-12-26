import js from "@eslint/js";

export default [
  {
    ...js.configs.recommended,
    files: ["**/*.{js,jsx}"],
    rules: {
      "no-unused-vars": "error",
      "no-console": "warn",
      "complexity": ["warn", { "max": 10 }]
    }
  }
];
