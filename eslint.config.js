import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import litPlugin from "eslint-plugin-lit";

export default [
  {
    files: ["src/**/*.ts"],
    rules: {
      strict: "error",
    },
  },
  {
    files: ["src/**/*.ts"],
    plugins: {
      "@typescript-eslint": tseslint,
      lit: litPlugin,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.strict.rules,
      ...litPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-inferrable-types": "error",
      // "max-len": ["warn", { "code": 80, "ignoreComments": true }]
    },
    languageOptions: {
      parserOptions: {
        createDefaultProgram: true,
      },
    },
    settings: {
      polyfills: ["navigator.userAgentData"],
    },
  },
];
