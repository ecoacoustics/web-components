import { multipleSpectrogramFixture as test } from "./spectrogram-media-controls.e2e.fixture";
import { MediaControls } from "../../components/mediaControls/mediaControls";
import { expect } from "@sand4rt/experimental-ct-web";
import { setBrowserValue } from "../helpers";

test.describe("oe-spectrogram interaction with oe-media-controls", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("playing and pausing with multiple spectrograms", async ({ fixture }) => {
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne)).toBe(false);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo)).toBe(false);

    await fixture.mediaControlsActionButton.click();

    // because the media controls are only linked to the first spectrogram, we
    // should not see the second spectrogram start playing
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne)).toBe(true);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo)).toBe(false);
  });

  test("changing media controls to another spectrogram", async ({ fixture }) => {
    await fixture.mediaControlsActionButton.click();
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne)).toBe(true);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo)).toBe(false);
    await fixture.mediaControlsActionButton.click();
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne)).toBe(false);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo)).toBe(false);

    // change the "for" attribute on the media controls to the second spectrogram
    await setBrowserValue<MediaControls>(fixture.mediaControls, "for", "second");

    await fixture.mediaControlsActionButton.click();
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne)).toBe(false);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo)).toBe(true);
  });

  test("unbinding a media controls element from a spectrogram", async ({ fixture }) => {
    await setBrowserValue<MediaControls>(fixture.mediaControls, "for", undefined);

    await fixture.mediaControlsActionButton.click();
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne)).toBe(false);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo)).toBe(false);
  });
});
