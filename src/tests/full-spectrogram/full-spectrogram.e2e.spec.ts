import { expect } from "../assertions";
import { catchLocatorEvent } from "../helpers";
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

  test("should automatically pause when the audio ends", async ({ fixture }) => {
    const playEvent = catchLocatorEvent(fixture.audioElement(), "play");
    await fixture.playAudio();
    await playEvent;
    await catchLocatorEvent(fixture.audioElement(), "ended");

    const isPlayingState = await fixture.isAudioPlaying();
    const mediaControlsIcon = await fixture.mediaControlsPlayIcon();

    expect(isPlayingState).toBe(false);
    expect(mediaControlsIcon).toBe("play");
  });

  test("should be able to restart the audio after it ends", async ({ fixture }) => {
    const playEvent = catchLocatorEvent(fixture.audioElement(), "play");
    await fixture.playAudio();
    await playEvent;
    await catchLocatorEvent(fixture.audioElement(), "ended");

    const isPlayingState = await fixture.isAudioPlaying();
    const mediaControlsIcon = await fixture.mediaControlsPlayIcon();

    expect(isPlayingState).toBe(false);
    expect(mediaControlsIcon).toBe("play");
  });

  test("playing and pausing audio in quick succession", async ({ fixture }) => {
    await fixture.playAudio();
    await fixture.pauseAudio();

    const expectedPlayingState = false;
    const realizedPlayingState = await fixture.isAudioPlaying();

    const expectedMediaControlsIcon = "play";
    const realizedMediaControlsIcon = await fixture.mediaControlsPlayIcon();

    expect(realizedPlayingState).toBe(expectedPlayingState);
    expect(realizedMediaControlsIcon).toBe(expectedMediaControlsIcon);

    await fixture.playAudio();

    const realizedPlayingStateAfterPlay = await fixture.isAudioPlaying();
    const realizedMediaControlsIconAfterPlay = await fixture.mediaControlsPlayIcon();

    expect(realizedPlayingStateAfterPlay).toBe(true);
    expect(realizedMediaControlsIconAfterPlay).toBe("pause");
  });

  test.skip("playing audio with the space bar", async ({ fixture }) => {
    await fixture.pressSpaceBar();

    const expectedPlayingState = true;
    const realizedPlayingState = await fixture.isAudioPlaying();

    const expectedMediaControlsIcon = "pause";
    const realizedMediaControlsIcon = await fixture.mediaControlsPlayIcon();

    expect(realizedPlayingState).toEqual(expectedPlayingState);
    expect(realizedMediaControlsIcon).toEqual(expectedMediaControlsIcon);
  });

  test("should pause and reset the playback time to 0 when the spectrograms source changes", async ({ fixture }) => {
    await fixture.playAudio();

    const isAudioPlaying = await fixture.isAudioPlaying();
    expect(isAudioPlaying).toBe(true);

    await fixture.changeSpectrogramSource("http://localhost:3000/example2.flac");

    const isAudioPlayingAfterChange = await fixture.isAudioPlaying();
    expect(isAudioPlayingAfterChange).toBe(false);

    const mediaControlsIcon = await fixture.mediaControlsPlayIcon();
    expect(mediaControlsIcon).toBe("play");

    const currentTime = await fixture.audioPlaybackTime();
    expect(currentTime).toBe(0);
  });
});
