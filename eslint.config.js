import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      complexity: ["error", 8],
      "max-lines-per-function": [
        "error",
        { max: 35, skipBlankLines: true, skipComments: true }
      ],
      "max-depth": ["error", 3],
      "no-unused-vars": "error",
      "no-console": "warn"
    }
  },
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "demo-output/**",
      ".agents/**"
    ]
  }
];
