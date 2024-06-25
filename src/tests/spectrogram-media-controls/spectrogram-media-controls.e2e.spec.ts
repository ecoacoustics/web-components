import { multipleSpectrogramFixture as test } from "./spectrogram-media-controls.e2e.fixture";
import { MediaControlsComponent } from "../../components/media-controls/media-controls";
import { removeBrowserAttribute, setBrowserAttribute } from "../helpers";
import { expect } from "../assertions";

test.describe("two spectrograms with different ids", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("playing and pausing with multiple spectrograms", async ({ fixture }) => {
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne())).toBe(false);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo())).toBe(false);

    await fixture.playAudio();

    // because the media controls are only linked to the first spectrogram, we
    // should not see the second spectrogram start playing
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne())).toBe(true);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo())).toBe(false);
  });

  test("changing media controls to another spectrogram", async ({ fixture }) => {
    await fixture.playAudio();
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne())).toBe(true);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo())).toBe(false);
    await fixture.pauseAudio();
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne())).toBe(false);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo())).toBe(false);

    // change the "for" attribute on the media controls to the second spectrogram
    await setBrowserAttribute<MediaControlsComponent>(fixture.mediaControls(), "for", "second");

    await fixture.playAudio();
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne())).toBe(false);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo())).toBe(true);
  });

  test("unbinding a media controls element from a spectrogram", async ({ fixture }) => {
    await removeBrowserAttribute<MediaControlsComponent>(fixture.mediaControls(), "for");

    await fixture.playAudio();
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne())).toBe(false);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo())).toBe(false);
  });
});

test.describe("multiple spectrograms with the same ids", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.createWithSameIds();
  });

  test("playing and pausing", async ({ fixture }) => {
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne())).toBe(false);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo())).toBe(false);

    await fixture.playAudio();
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne())).toBe(true);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo())).toBe(false);

    await fixture.pauseAudio();
    expect(await fixture.isPlayingAudio(fixture.spectrogramOne())).toBe(false);
    expect(await fixture.isPlayingAudio(fixture.spectrogramTwo())).toBe(false);
  });
});

test.describe("Changing spectrogram options with media controls", () => {
  test.fixme("should have the default values checked", () => {});

  test.fixme("should have a checkbox next to the selected option", () => {});

  test.fixme("should not show window overlaps larger than the window sizes initial size", () => {});

  test.fixme("should update window overlaps when changing the window size", () => {});

  test.fixme("changing the spectrogram colors", () => {});

  test.fixme("changing the spectrograms scale", () => {});

  test.fixme("changing brightness", () => {});

  test.fixme("changing contrast", () => {});

  test.fixme("changing the window function", () => {});

  test.fixme("changing the window size", () => {});

  test.fixme("changing the window overlap", () => {});
});

test.describe("Changing an axes without a spectrogram", () => {
  test.fixme("adding and removing the x-axis title", () => {});

  test.fixme("adding and removing the y-axis title", () => {});

  test.fixme("adding and removing the x-axis labels", () => {});

  test.fixme("adding and removing the y-axis labels", () => {});

  test.fixme("adding and removing the x-axis grid lines", () => {});

  test.fixme("adding and removing the y-axis grid lines", () => {});
});
