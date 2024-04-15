import { expect } from "@playwright/test";
import { indicatorSpectrogramMediaControlsFixture } from "./indicator-spectrogram-mediacontrols.fixture";

const customFixture = indicatorSpectrogramMediaControlsFixture;

customFixture.describe("oe-indicator interaction with spectrogram and media controls", () => {
  customFixture.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  customFixture.describe("indicator", () => {
    customFixture("initial position", async ({ fixture }) => {
      const initialPosition = await fixture.indicatorPosition();
      await expect(initialPosition).toBe(0);
    });

    customFixture("playing audio should cause the indicator to move the correct amount", async ({ fixture, page }) => {
      const initialPosition = await fixture.indicatorPosition();

      await fixture.toggleAudio();
      await page.waitForTimeout(3000);

      const finalPosition = await fixture.indicatorPosition();

      await expect(finalPosition).toBeGreaterThan(initialPosition);
    });

    customFixture("playing and pausing audio", async ({ fixture, page }) => {
      await fixture.playAudio();
      await page.waitForTimeout(1000);
      await fixture.pauseAudio();

      const initialPosition = await fixture.indicatorPosition();
      await page.waitForTimeout(1000);
      const finalPosition = await fixture.indicatorPosition();

      await expect(finalPosition).toEqual(initialPosition);
    });

    customFixture("playing to the end of a recording", async ({ fixture, page }) => {
      await fixture.playAudio();
      await page.waitForTimeout(await fixture.audioDuration());

      const initialPosition = await fixture.indicatorPosition();
      await page.waitForTimeout(1000);
      const finalPosition = await fixture.indicatorPosition();

      await expect(finalPosition).toEqual(initialPosition);
    });
  });
});
