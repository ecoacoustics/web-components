import { Locator, MatcherReturnType } from "@playwright/test";
import { expect as playwrightExpect, test as base } from "@sand4rt/experimental-ct-web";

async function toHaveTrimmedText(received: Locator, expected: string): Promise<MatcherReturnType> {
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

/**
 * A snapshot test that has a higher tolerance for browser rendering
 * discrepancies.
 * This is typically used to test the layout of a page/component and should be
 * used for svg or canvas rendering assertions.
 */
async function toHaveLayoutScreenshot(
  locator: Locator,
  options: Record<string, unknown> = {},
): Promise<MatcherReturnType> {
  // because we want to test layout, we want to allow 0.5 pixels of difference
  // on each size of the element.
  // This allows for operating systems to handle sub-pixel rendering differently
  // without the test failing.
  // Because playwright takes in the number of pixels that are allowed to be
  // different, we use the size of the elements layout container to determine
  // the allowed difference.
  const locatorSize = await locator.boundingBox();
  const xAllowance = locatorSize?.width ?? 0 / 2;
  const yAllowance = locatorSize?.height ?? 0 / 2;

  const maxDiffPixels = xAllowance + yAllowance;

  const mergedOptions = Object.assign(options, {
    maxDiffPixels,
  });

  await expect(locator).toHaveScreenshot(mergedOptions);

  // because we have a screenshot assertion above, this assertion will throw an
  // error before we get to return a value, causing the assertion to fail.
  return {
    pass: true,
    message: () => "",
  };
}

/**
 * Asserts that an element has specific slotted text.
 * This assertion cannot be done through normal toHaveText() locator assertions
 * because the selector will assert against the shadow dom locator, where the
 * light-dom slotted content does not exist.
 */
export async function toHaveSlottedText(locator: Locator, expectedText: string): Promise<MatcherReturnType> {
  const realizedText = await locator.evaluate((slot: HTMLElement) => {
    if (!(slot instanceof HTMLSlotElement)) {
      throw new Error("toHaveSlottedText can only be used on a slot element");
    }

    const assignedElements = slot.assignedElements({ flatten: true });

    // If there are no assigned elements, we return the default text content of
    // the slot element.
    // This is the same behavior as web browsers.
    if (assignedElements.length === 0) {
      return slot.textContent;
    }

    const assignedText = assignedElements.map((element) => element.textContent);
    const slotText = assignedText.join("");

    return slotText;
  });

  const pass = realizedText === expectedText;

  return {
    pass,
    message: () => `expected '${realizedText}' to equal '${expectedText}'`,
  };
}

export const expect = playwrightExpect.extend({
  toHaveTrimmedText,
  toHaveLayoutScreenshot,
  toHaveSlottedText,
});
export const test = base.extend({
  page: async ({ page }, use) => {
    // sometimes our components throw errors. In these cases, we want to fail
    // the test immediately
    page.on("pageerror", (error) => {
      throw new Error(`Page error occurred: "${error.message}"`);
    });

    // Listening to console messages is a custom Playwright feature that allows
    // us to catch soft-failures in the browser console.
    // Note that we usually try to recover from console errors, but it means
    // that we have ended up in an unexpected state.
    // see: https://playwright.dev/docs/api/class-consolemessage
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const loc = msg.location();
        const where = loc?.url ? ` at ${loc.url}:${loc.lineNumber}:${loc.columnNumber}` : "";
        throw new Error(`Console error occurred${where}: "${msg.text()}"`);
      }
    });

    await use(page);
  },
});

// We manually destroy/close the page fixture after each test to make some
// Firefox tests less flaky.
// I suspect that this is not the correct fix and that there are underlying
// issues within our tests.
// see: https://github.com/microsoft/playwright/issues/31050#issuecomment-2633407029
test.afterEach(async ({ page, context }) => {
  await page.close();
  await context.close();
});
