module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-inferrable-types": "error",
    // "max-len": ["warn", { "code": 120 }]
    "no-console": [
      "error",
      {
        allow: ["warn", "error", "time", "timeEnd", "debug"],
      },
    ],
  },
  settings: {
    polyfills: ["navigator.userAgentData"],
  },
  overrides: [
    {
      extends: ["eslint:recommended", "plugin:@typescript-eslint/strict-type-checked", "plugin:lit/recommended"],
      plugins: ["@typescript-eslint", "lit"],
      files: ["src/components/"],
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        projectService: true,
      },
    },
    {
      extends: ["eslint:recommended", "plugin:@typescript-eslint/strict-type-checked", "plugin:playwright/recommended"],
      files: ["**/*.spec.ts", "**/*.fixture.ts", "src/tests/**/*.ts"],
      excludedFiles: ["node_modules/", "dist/", "@types/"],
      parserOptions: {
        project: "./tsconfig.spec.json",
        tsconfigRootDir: __dirname,
        projectService: true,
      },
      rules: {
        "@typescript-eslint/await-thenable": "warn",

        // We turn off these rules because tests often use "any" types to test
        // invalid inputs in non-typechecked environments.
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/restrict-template-expressions": "off",

        // We have added the playwright linting rules to protect against common
        // mistakes that can cause leaky tests such as not awaiting assertions.
        // Therefore, I have disabled rules that are stylistic and do not affect
        // the correctness of the tests.
        //
        // TODO: we should consider enabling these rules in the future, but
        // I have temporarily disabled stylistic rules to avoid unnecessary
        // work that don't directly prevent bugs.
        "@typescript-eslint/no-floating-promises": "error",
        "playwright/valid-describe-callback": "off",
        "playwright/valid-title": "off",
        "playwright/expect-expect": "off",
        "playwright/no-skipped-test": "off",
        "playwright/no-conditional-in-test": "off",
        "playwright/no-conditional-expect": "off",
        "playwright/no-networkidle": "off",
      },
    },
  ],
};
