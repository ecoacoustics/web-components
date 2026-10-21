import { expect, test } from "../assertions";
import { setContent } from "../fixtures";
import { waitForContentReady } from "./helpers";

test("fixture readiness should not wait for unrelated network requests", async ({ page }) => {
  let releaseRequest!: () => void;
  const requestGate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route("**/pending-readiness-request", async (route) => {
    await requestGate;
    await route.fulfill({ body: "finished" });
  });
  const requestFinished = page.waitForResponse("**/pending-readiness-request");

  try {
    await setContent(page, '<div data-testid="ready">Ready</div>');
    const requestStarted = page.waitForRequest("**/pending-readiness-request");
    await page.evaluate(() => {
      void fetch("/pending-readiness-request");
    });
    await requestStarted;

    await waitForContentReady(page, ['[data-testid="ready"]']);
    await expect(page.getByTestId("ready")).toBeVisible();
  } finally {
    releaseRequest();
    await requestFinished;
  }
});
