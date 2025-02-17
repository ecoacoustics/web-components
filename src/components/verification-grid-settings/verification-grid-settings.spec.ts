import { expect } from "../../tests/assertions";
import { settingsFixture as test } from "./verification-grid-settings.fixture";

test.describe("Verification Grid Settings Component", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();

    // I assert that the window is not fullscreen so that the tests will fail
    // if there is context / test leakage
    const initialFullscreenState = await fixture.isFullscreen();
    expect(initialFullscreenState).toBe(false);
  });

  test.describe("Fullscreen mode", () => {
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

  test.describe("Changing grid size", () => {
    // we test that the settings component can change the grid size to one
    // because it is the smallest value that can be set through the settings
    // component
    test("should be able to change the grid size to one", async ({ fixture }) => {
      const testGridSize = 1;
      await fixture.changeSettingsGridSize(testGridSize);

      const realizedGridSize = await fixture.verificationGridSize();
      expect(realizedGridSize).toBe(testGridSize);
    });

    // we test that the settings component can change the grid size to twelve
    // because it is the largest value that can be set through the settings
    // component
    test("should be able to change the grid size to twelve", async ({ fixture }) => {
      const testGridSize = 12;
      await fixture.changeSettingsGridSize(testGridSize);

      const realizedGridSize = await fixture.verificationGridSize();
      expect(realizedGridSize).toBe(testGridSize);
    });

    // this test asserts that if the verification grids size is updated through
    // the settings component that the correct grid size is shown in the input
    test("should have the correct input value after changing the grid size through the input", async ({ fixture }) => {
      const testValue = 8;
      await fixture.changeSettingsGridSize(testValue);

      const realizedInputValue = await fixture.gridSizeInputValue();
      expect(realizedInputValue).toBe(testValue.toString());
    });

    test("should have the correct label after changing the grid size through the input", async ({ fixture }) => {
      const expectedLabel = "8";
      await fixture.changeSettingsGridSize(8);
      await expect(fixture.gridSizeLabel()).toHaveText(expectedLabel);
    });

    // this tests asserts that if the verification grids size is updated
    // not through the settings component (e.g. through an attribute change)
    // that the correct grid size is shown in the input
    test("should have the correct input value after changing the grid size through grid", async ({ fixture }) => {
      const testValue = "4";
      await fixture.changeVerificationGridSize(testValue);

      const realizedInputValue = await fixture.gridSizeInputValue();
      expect(realizedInputValue).toBe(testValue);
    });

    test("should have the correct label after changing the grid size through grid", async ({ fixture }) => {
      const expectedLabel = "8";
      await fixture.changeSettingsGridSize(8);
      await expect(fixture.gridSizeLabel()).toHaveText(expectedLabel);
    });

    // TODO: these tests are currently disabled because we have not implemented
    // the functionality ot automatically scale down the verification grid if
    // it does not fit on the screen
    test.skip("should not be able to change the grid size to a count that would not fit on the screen", () => {});
  });
});
