import { Locator } from "@playwright/test";
import { expect as playwrightExpect, test as base } from "@sand4rt/experimental-ct-web";

async function toHaveTrimmedText(received: Locator, expected: string) {
  const elementText = await received.textContent();

  if (elementText === null) {
    return {
      pass: false,
      message: () => `expected ${received} to have trimmed text, but the element was not found`,
    };
  }

  const expectedText = expected.trim();
  const realizedText = elementText.trim();
  const pass = expectedText === realizedText;

  return {
    pass,
    message: () => `expected '${realizedText}' to be '${expectedText}'`,
  };
}

export const expect = playwrightExpect.extend({
  toHaveTrimmedText,
});

export const test = base.extend({
  page: async ({ page }, use) => {
    // sometimes our components throw errors. In these cases, we want to fail
    // the test immediately
    page.on("pageerror", (error) => {
      throw new Error(`Page error occurred: "${error.message}"`);
    });
    await use(page);
  },
});

test.afterEach(async ({ page }) => {
  await page.close();
});
