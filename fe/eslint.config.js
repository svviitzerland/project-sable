import js from "@eslint/js";
import ts from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
export default ts.config(
  {
    ignores: [
      ".svelte-kit/**",
      ".vercel/**",
      "build/**",
      "node_modules/**",
      ".next/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: { parserOptions: { parser: ts.parser } },
  },
  { files: ["**/*.ts", "**/*.svelte"], rules: { "no-undef": "off" } },
  {
    files: ["static/audio/*.js"],
    languageOptions: {
      globals: {
        AudioWorkletProcessor: "readonly",
        registerProcessor: "readonly",
      },
    },
  },
);
