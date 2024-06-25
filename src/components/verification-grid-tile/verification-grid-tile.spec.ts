import { describe } from "node:test";
import { verificationGridTileFixture as test } from "./verification-grid-tile.fixture";
import { expect } from "../../tests/assertions";

test.describe("verification grid tile", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  [false, true].forEach((useShortcutKeys: boolean) => {
    const shortcutKeysText = useShortcutKeys ? "with shortcut keys" : "key mouse click";
    const selectionStrategy = (fixture: any) =>
      useShortcutKeys ? fixture.keyboardSelectSpectrogramTile() : fixture.mouseSelectSpectrogramTile();

    describe(`selection ${shortcutKeysText}`, () => {
      test(`should select the tile ${shortcutKeysText}`, async ({ fixture }) => {
        await selectionStrategy(fixture);
        expect(await fixture.isSelected()).toBe(true);
      });

      test(`should select the tile when the ctrl key is pressed ${shortcutKeysText}`, () => {});

      test(`should select the tile when the shift key is pressed ${shortcutKeysText}`, () => {});

      test(`should select the tile when the ctrl and shift keys are pressed ${shortcutKeysText}`, () => {});

      test(`should not change the selection state if the tile is already selected ${shortcutKeysText}`, () => {});

      test(`should be able to deselect the tile using the ctrl key ${shortcutKeysText}`, () => {});
    });
  });

  test("should show selection highlight when selected", () => {});

  test("should show the decision color correctly", () => {});

  test("should show keyboard shortcuts when the alt key is held down", () => {});

  test("should be able to use the spacebar to play audio", () => {});

  test("should be able to use the spacebar to pause audio", () => {});
});
