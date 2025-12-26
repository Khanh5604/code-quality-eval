import js from "@eslint/js";
import react from "eslint-plugin-react";

export default [
  {
    ...js.configs.recommended,
    files: ["**/*.{js,jsx}"],
    ignores: ["dist/**", "node_modules/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly"
      }
    },
    plugins: {
      react
    },
    rules: {
      "react/react-in-jsx-scope": "off"
    }
  }
];
