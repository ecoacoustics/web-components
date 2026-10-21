import { getEventLogs, logEvent } from "../helpers/helpers";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import { sleep } from "../../helpers/utilities";

test.describe("interaction with the host application", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.createWithAppChrome();
  });

  test("should not select all tiles when ctrl + A is pressed inside the input box", async ({ fixture }) => {
    await fixture.hostAppInput().press("ControlOrMeta+a");
    const selectedTiles = await fixture.selectedTileIndexes();
    expect(selectedTiles).toHaveLength(0);
  });

  test("should not make a decision when using a shortcut in the host applications input", async ({ fixture }) => {
    await logEvent(fixture.page, "decision");

    // try both lowercase and uppercase shortcuts
    await fixture.hostAppInput().press("Y");
    await fixture.hostAppInput().press("y");

    await sleep(1);

    const events: unknown[] = await getEventLogs(fixture.page, "decision");
    expect(events).toHaveLength(0);
  });

  test("should not play spectrograms when the spacebar is pressed in the host app input", async ({ fixture }) => {
    // to give the grid tiles the best chance at playing the audio
    // (if the logic is faulty), we make a sub-selection first
    await fixture.subSelect(0);
    await fixture.hostAppInput().press("Space");

    const isPlaying = await fixture.isAudioPlaying(0);
    expect(isPlaying).toEqual(false);
  });

  test("should allow ctrl + A once the verification grid regains focus", async ({ fixture }) => {
    await fixture.hostAppInput().press("ControlOrMeta+a");

    // select a tile to ensure that the grid has focus
    await fixture.subSelect(0);
    await fixture.page.keyboard.press("ControlOrMeta+a");

    const expectedSelectedTiles = await fixture.getGridSize();
    const selectedTiles = await fixture.selectedTileIndexes();
    expect(selectedTiles).toHaveLength(expectedSelectedTiles);
  });

  test("should allow decision shortcuts once the verification grid regains focus", async ({ fixture }) => {
    await fixture.hostAppInput().press("y");

    await logEvent(fixture.page, "decision");

    // select a tile to ensure that the grid has focus
    await fixture.subSelect(0);
    await fixture.page.keyboard.press("y");

    const events: unknown[] = await getEventLogs(fixture.page, "decision");
    expect(events).toHaveLength(1);
  });

  test("should allow the spacebar to play audio once the verification grid regains focus", async ({ fixture }) => {
    await fixture.hostAppInput().press("Space");

    // select a tile to ensure that the grid has focus
    await fixture.subSelect(0);
    await fixture.page.keyboard.press("Space");

    const isPlaying = await fixture.isAudioPlaying(0);
    expect(isPlaying).toEqual(true);
  });
});
