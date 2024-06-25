import { expect } from "../assertions";
import { fullFixture as test } from "./full-spectrogram.e2e.fixture";

test.describe("interactions between all components", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("playing audio", async ({ fixture }) => {
    await fixture.playAudio();

    const expectedPlayingState = true;
    const realizedPlayingState = await fixture.isAudioPlaying();
    expect(realizedPlayingState).toEqual(expectedPlayingState);
  });

  test("pausing audio", async ({ fixture, page }) => {
    await fixture.playAudio();
    await page.waitForTimeout(500);
    await fixture.pauseAudio();

    const expectedPlayingState = false;
    const realizedPlayingState = await fixture.isAudioPlaying();
    expect(realizedPlayingState).toEqual(expectedPlayingState);
  });

  test("restarting audio", async ({ fixture, page }) => {
    await fixture.playAudio();
    await page.waitForTimeout(500);
    await fixture.pauseAudio();
    await page.waitForTimeout(500);
    await fixture.playAudio();

    const expectedPlayingState = true;
    const realizedPlayingState = await fixture.isAudioPlaying();
    expect(realizedPlayingState).toEqual(expectedPlayingState);
  });

  test("playing and pausing audio in quick succession", async ({ fixture }) => {
    await fixture.playAudio();
    await fixture.pauseAudio();

    const expectedPlayingState = false;
    const realizedPlayingState = await fixture.isAudioPlaying();
    expect(realizedPlayingState).toEqual(expectedPlayingState);
  });

  test.fixme("playing audio with the space bar", async ({ fixture }) => {
    await fixture.pressSpaceBar();

    const expectedPlayingState = true;
    const realizedPlayingState = await fixture.isAudioPlaying();
    expect(realizedPlayingState).toEqual(expectedPlayingState);
  });
});
