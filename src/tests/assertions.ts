import { Locator } from "@playwright/test";
import { expect as playwrightExpect } from "@sand4rt/experimental-ct-web";

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
