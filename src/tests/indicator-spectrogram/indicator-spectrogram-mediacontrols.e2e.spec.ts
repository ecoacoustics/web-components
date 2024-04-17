import { expect } from "@playwright/test";
import { indicatorSpectrogramMediaControlsFixture as test } from "./indicator-spectrogram-mediacontrols.fixture";

test.describe("oe-indicator interaction with spectrogram and media controls", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test.describe("indicator position", () => {
    test("initial position", async ({ fixture }) => {
      const initialPosition = await fixture.indicatorPosition();
      await expect(initialPosition).toBe(0);
    });

    test("playing audio should cause the indicator to move the correct amount", async ({ fixture, page }) => {
      const initialPosition = await fixture.indicatorPosition();

      await fixture.toggleAudio();
      await page.waitForTimeout(3000);

      const finalPosition = await fixture.indicatorPosition();

      await expect(finalPosition).toBeGreaterThan(initialPosition);
    });

    test("playing and pausing audio", async ({ fixture, page }) => {
      await fixture.playAudio();
      await page.waitForTimeout(1000);
      await fixture.pauseAudio();

      const initialPosition = await fixture.indicatorPosition();
      await page.waitForTimeout(1000);
      const finalPosition = await fixture.indicatorPosition();

      await expect(finalPosition).toEqual(initialPosition);
    });

    test("playing to the end of a recording", async ({ fixture, page }) => {
      await fixture.playAudio();
      // go to the end of the recording
      await page.waitForTimeout(await fixture.audioDuration());

      // when at the end of the recording, wait for an additional second
      const initialPosition = await fixture.indicatorPosition();
      await page.waitForTimeout(1000);
      const finalPosition = await fixture.indicatorPosition();

      // make sure that after waiting a second at the end of the recording
      // that the indicator hasn't moved
      await expect(finalPosition).toEqual(initialPosition);
    });
  });

  test.describe("removing spectrogram component", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.removeSpectrogramElement();
    });

    test("position of indicator", async ({ fixture }) => {
      const initialPosition = await fixture.indicatorPosition();
      await expect(initialPosition).toBe(0);
    });

    // the indicator should not move if the spectrogram component is removed
    // because there is no audio to play
    test("functionality of indicator", async ({ fixture, page }) => {
      await fixture.playAudio();
      await page.waitForTimeout(1000);

      const position = await fixture.indicatorPosition();

      await expect(position).toBe(0);
    });
  });

  test.describe("changing spectrogram audio source while playing", () => {
    test.beforeEach(async ({ fixture, page }) => {
      // we simulate playing the audio for half a second before changing the audio source
      // so that the indicator has a non-zero position
      // we should see it reset, and be functional with the new audio source
      await fixture.playAudio();
      await page.waitForTimeout(500);
      await fixture.pauseAudio();

      await fixture.changeSpectrogramAudioSource("example2.flac");
    });

    test("position of indicator after changing spectrogram audio source", async ({ fixture }) => {
      const indicatorPosition = await fixture.indicatorPosition();
      expect(indicatorPosition).toBe(0);
    });

    test("functionality of indicator after changing spectrogram audio source", async ({ fixture, page }) => {
      const initialPosition = await fixture.indicatorPosition();

      await fixture.playAudio();
      await page.waitForTimeout(1000);
      await fixture.pauseAudio();

      const finalPosition = await fixture.indicatorPosition();

      expect(finalPosition).toBeGreaterThan(initialPosition);
    });
  });
});
