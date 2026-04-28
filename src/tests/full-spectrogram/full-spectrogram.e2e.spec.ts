import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import { sleep } from "../../helpers/utilities";
import { Size } from "../../models/rendering";
import { expect } from "../assertions";
import { catchLocatorEvent, setElementSize } from "../helpers/helpers";
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

  test("pausing audio", async ({ fixture }) => {
    await fixture.playAudio();
    await sleep(0.5);
    await fixture.pauseAudio();

    const expectedPlayingState = false;
    const realizedPlayingState = await fixture.isAudioPlaying();
    expect(realizedPlayingState).toEqual(expectedPlayingState);
  });

  test("restarting audio", async ({ fixture }) => {
    await fixture.playAudio();
    await sleep(0.5);
    await fixture.pauseAudio();
    await sleep(0.5);
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

  test("playing audio with the space bar", async ({ fixture }) => {
    await fixture.shortcutPlaySpectrogram();

    const expectedPlayingState = true;
    const realizedPlayingState = await fixture.isAudioPlaying();

    const expectedMediaControlsIcon = "pause";
    const realizedMediaControlsIcon = await fixture.mediaControlsPlayIcon();

    expect(realizedPlayingState).toEqual(expectedPlayingState);
    expect(realizedMediaControlsIcon).toEqual(expectedMediaControlsIcon);
  });

  test("should not play if the 'play' event is canceled", async ({ fixture }) => {
    const playEvent = catchLocatorEvent(fixture.spectrogramComponent(), "play");

    // I cannot cancel the event in the playwright NodeJS context because
    // the event prototype is not exposed in the NodeJS context.
    // Therefore, I cancel the play event in the browser context and cancel
    await fixture.spectrogramComponent().evaluate((element: SpectrogramComponent) => {
      element.addEventListener("play", (event) => {
        event.preventDefault();
      });
    });

    await fixture.playAudio();
    await playEvent;

    const isPlayingState = await fixture.isAudioPlaying();
    const mediaControlsIcon = await fixture.mediaControlsPlayIcon();

    expect(isPlayingState).toBe(false);
    expect(mediaControlsIcon).toBe("play");
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

test.describe("sizing", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should include chrome height in spectrogram host sizing", async ({ fixture }) => {
    const testedSize = { width: 300, height: 300 } as const satisfies Size;
    await setElementSize(fixture.spectrogramComponent(), testedSize);

    const realizedSize = await fixture.getSpectrogramHostSize();
    expect(realizedSize).toEqual(testedSize);

    const chromeSize = await fixture.getChromeSize();
    const canvasSize = await fixture.getCanvasSize();

    expect(realizedSize).toEqual({
      width: canvasSize.width + chromeSize.width,
      height: canvasSize.height + chromeSize.height,
    });
  });

  // TODO: this is currently broken because if the user resizes the canvas
  // without resizing the spectrogram, the canvas will overflow the host element
  test.fixme("should not include chrome height in spectrogram canvas sizing", async ({ fixture }) => {
    const testedSize = { width: 300, height: 300 } satisfies Size;
    await setElementSize(fixture.canvasElement(), testedSize);

    const canvasSize = await fixture.getCanvasSize();
    expect(canvasSize).toEqual(testedSize);

    const spectrogramSize = await fixture.getSpectrogramHostSize();
    const chromeSize = await fixture.getChromeSize();

    expect(spectrogramSize).toEqual({
      width: canvasSize.width + chromeSize.width,
      height: canvasSize.height + chromeSize.height,
    });
  });
});
