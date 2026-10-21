import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";

test.describe("single verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.describe("playing and pausing tiles", () => {
    test.describe("no sub-selection", () => {
      test.fixme("should play all tiles when the play shortcut is pressed", async ({ fixture }) => {
        const expectedPlayingCount = await fixture.getTileCount();

        await fixture.shortcutGridPlay();
        const realizedPlayingStates = await fixture.playingSpectrograms();

        expect(realizedPlayingStates).toHaveLength(expectedPlayingCount);
      });

      test("should play a single tile in a 1x1 grid with keyboard shortcuts", async ({ fixture }) => {
        const expectedPlayingCount = 1;
        await fixture.changeGridSize(1);

        await fixture.shortcutGridPlay();

        const realizedPlayingStates = await fixture.playingSpectrograms();
        expect(realizedPlayingStates).toHaveLength(expectedPlayingCount);
      });

      test("should pause all tiles when the pause shortcut is pressed", () => {});
    });

    test.describe("with sub-selection", () => {
      const testedSubSelection = [0, 1];
      test.beforeEach(async ({ fixture }) => {
        await fixture.subSelect(testedSubSelection, ["ControlOrMeta"]);
        await fixture.page.waitForTimeout(1_000);
      });

      test("should only play selected tiles when the play shortcut is pressed", async ({ fixture }) => {
        await fixture.shortcutGridPlay();
        const realizedPlayingStates = await fixture.playingSpectrograms();
        expect(realizedPlayingStates).toHaveLength(testedSubSelection.length);
      });

      // in this test, we assert that if two tiles are playing and the user
      // de-selects one of the tiles, only the selected tile should stop
      // when the user presses the pause shortcut
      test("should only pause selected tiles when the pause shortcut is pressed", async ({ fixture }) => {
        await fixture.shortcutGridPlay();

        const initialPlayingSpectrograms = await fixture.playingSpectrograms();
        expect(initialPlayingSpectrograms).toHaveLength(2);

        // Wait for a second for the audio to start playing
        // TODO: Remove this hack
        await fixture.page.waitForTimeout(1_000);

        await fixture.subSelect(1);
        await fixture.shortcutGridPause();

        const afterPausePlayingSpectrograms = await fixture.playingSpectrograms();
        expect(afterPausePlayingSpectrograms).toHaveLength(1);
      });
    });
  });
});
