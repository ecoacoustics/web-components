import { expect, test } from "./assertions";

const browserlessTest = test.extend({
  browser: ({ browserName }) => Promise.reject(new Error(`A browser-free test unexpectedly launched ${browserName}`)),
});

browserlessTest("tests without a page should not initialize browser fixtures during teardown", () => {
  expect(1 + 1).toBe(2);
});
