import { expect } from "@sand4rt/experimental-ct-web";
import { spectrogramFixture } from "./spectrogram.fixture";

spectrogramFixture.describe("spectrogram", () => {
    spectrogramFixture.beforeEach(async ({ fixture }) => {
        await fixture.create();
    });

    spectrogramFixture("play and pausing audio with src='' attribute", async ({ fixture }) => {
        await fixture.play();
        let isComponentPlaying = await fixture.isComponentPlaying();
        let isAudioPlaying = await fixture.isComponentPlaying();

        await expect(isComponentPlaying).toBe(true);
        await expect(isAudioPlaying).toBe(true);

        await fixture.pause();
        isComponentPlaying = await fixture.isComponentPlaying();
        isAudioPlaying = await fixture.isComponentPlaying();

        await expect(isComponentPlaying).toBe(false);
        await expect(isAudioPlaying).toBe(false);
    });

    spectrogramFixture("play and pausing audio with source slot", async ({ fixture }) => {
        const slot = `<source src="${fixture.audioSource}" type="audio/flac" />`;
        await fixture.updateSlot(slot);

        await fixture.play();
        let isComponentPlaying = await fixture.isComponentPlaying();
        let isAudioPlaying = await fixture.isComponentPlaying();

        await expect(isComponentPlaying).toBe(true);
        await expect(isAudioPlaying).toBe(true);

        await fixture.pause();
        isComponentPlaying = await fixture.isComponentPlaying();
        isAudioPlaying = await fixture.isComponentPlaying();

        await expect(isComponentPlaying).toBe(false);
        await expect(isAudioPlaying).toBe(false);
    });
});
