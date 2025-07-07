import { expect } from "../../tests/assertions";
import { userAgentDataFixture as test } from "./userAgent.fixture";

test.describe("isMacOs", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should return the correct value", async ({ fixture }) => {
    const expectedResult = fixture.isNodeMac();
    const realizedResult = await fixture.page.evaluate(async () => {
      // @ts-expect-error Because we are inside an evaluate function, we are
      // running inside the browser and therefore have access to isMacOs
      return isMacOs();
    });

    expect(realizedResult).toBe(expectedResult);
  });
});

test.describe("hasCtrlLikeModifier", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should correctly identify ctrl like modifier for a click event", async ({ fixture }) => {
    const testTarget = fixture.buttonElement();

    const realizedResult = testTarget.evaluate(async (element) => {
      return new Promise((resolve) => {
        element.addEventListener("pointerdown", (caughtEvent: any) => {
          // @ts-expect-error This function does exist in the browser
          const result = hasCtrlLikeModifier(caughtEvent);
          resolve(result);
        });
      });
    });

    await testTarget.click({ modifiers: ["ControlOrMeta"] });

    expect(await realizedResult).toBe(true);
  });

  // In this test, we assert that if the user presses meta on Windows this
  // function doesn't returns false, and if the user presses ctrl on MacOS this
  // function returns false.
  test("should not match inverse ctrl mapping for a click event", async ({ fixture }) => {
    const testTarget = fixture.buttonElement();

    const realizedResult = testTarget.evaluate(async (element) => {
      return new Promise((resolve) => {
        element.addEventListener("pointerdown", (caughtEvent: any) => {
          // @ts-expect-error This function does exist in the browser
          const result = hasCtrlLikeModifier(caughtEvent);
          resolve(result);
        });
      });
    });

    await testTarget.click({ modifiers: [fixture.isNodeMac() ? "Control" : "Meta"] });

    expect(await realizedResult).toBe(false);
  });
});
