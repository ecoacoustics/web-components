import { expect } from "@sand4rt/experimental-ct-web";
import { settingsFixture as test } from "./verification-grid-settings.fixture";

test.describe("Verification Grid Settings Component", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();

    // I assert that the window is not fullscreen so that the tests will fail
    // if there is context / test leakage
    const initialFullscreenState = await fixture.isFullscreen();
    expect(initialFullscreenState).toBe(false);
  });

  test("should fullscreen the verification grid when the fullscreen button is pressed", async ({ fixture }) => {
    await fixture.clickFullscreenButton();

    const isFullscreen = await fixture.isFullscreen();
    expect(isFullscreen).toBe(true);
  });

  test("should exit fullscreen when the button is pressed when in fullscreen mode", async ({ fixture }) => {
    await fixture.clickFullscreenButton();
    await fixture.clickFullscreenButton();

    const isFullscreen = await fixture.isFullscreen();
    expect(isFullscreen).toBe(false);
  });

  test("should be able to return to fullscreen after exiting fullscreen using the button", async ({ fixture }) => {
    await fixture.clickFullscreenButton();
    await fixture.clickFullscreenButton();

    await fixture.clickFullscreenButton();

    const isFullscreen = await fixture.isFullscreen();
    expect(isFullscreen).toBe(true);
  });
});
