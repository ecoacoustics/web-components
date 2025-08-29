import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import { sleep } from "../../helpers/utilities";
import { expect } from "../assertions";
import { getBrowserValue } from "../helpers";
import { indicatorSpectrogramMediaControlsFixture as test } from "./indicator-spectrogram-media-controls.e2e.fixture";

test.describe("oe-indicator interaction with spectrogram and media controls", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test.describe("indicator position", () => {
    test("initial position", async ({ fixture }) => {
      const initialPosition = await fixture.indicatorPosition();
      expect(initialPosition).toBe(0);
    });

    test("playing audio should cause the indicator to move the correct amount", async ({ fixture }) => {
      const initialPosition = await fixture.indicatorPosition();

      await fixture.playAudio();
      await sleep(1);
      await fixture.pauseAudio();

      // check that the audio element is playing
      const mediaElementTime = await getBrowserValue<HTMLAudioElement, number>(fixture.audioElement(), "currentTime");
      expect(mediaElementTime).toBeGreaterThan(0);

      // check that the spectrogram component is playing
      const spectrogramTime = await fixture
        .spectrogramComponent()
        .evaluate((element: SpectrogramComponent) => element.currentTime.peek());
      expect(spectrogramTime).toBeGreaterThan(0);

      // check that the indicator line has moved
      const finalPosition = await fixture.indicatorPosition();
      expect(finalPosition).toBeGreaterThan(initialPosition);
    });

    test("playing and pausing audio", async ({ fixture }) => {
      await fixture.playAudio();
      await sleep(1);
      await fixture.pauseAudio();

      const initialPosition = await fixture.indicatorPosition();
      await sleep(1);
      const finalPosition = await fixture.indicatorPosition();

      expect(finalPosition).toEqual(initialPosition);
    });

    // TODO: Remove the "fixme" from here once changing the source during
    // rendering doesn't result in unexpected state.
    // see: https://github.com/ecoacoustics/web-components/issues/480
    test.fixme("playing to the end of a recording", async ({ fixture }) => {
      await fixture.playAudio();
      // go to the end of the recording
      await sleep(await fixture.audioDuration());

      // when at the end of the recording, wait for an additional second
      const initialPosition = await fixture.indicatorPosition();
      await sleep(1);
      const finalPosition = await fixture.indicatorPosition();

      // make sure that after waiting a second at the end of the recording
      // that the indicator hasn't moved
      expect(finalPosition).toEqual(initialPosition);
    });

    // because Firefox doesn't provide high-resolution timestamps for the
    // currentTime property, we use a high resolution performance timer to
    // estimate the time elapsed since the last (real) recorded time
    // however, this can cause problems when the audio if buffering
    // because of this, we shouldn't interpolate high resolution timestamps
    // if the audio has not started playing (and we have received the first)
    // low resolution timestamp. Otherwise, the indicator will start moving
    // when there is no audio playing, then jump back to the beginning when
    // the audio starts playing.
    // this test will fail if the indicator moves before the audio starts playing
    test("playing audio after sleep", async () => {
      // noop
    });
  });

  test.describe("changing spectrogram audio source while playing", () => {
    test.beforeEach(async ({ fixture }) => {
      // we simulate playing the audio for half a second before changing the audio source
      // so that the indicator has a non-zero position
      // we should see it reset, and be functional with the new audio source
      await fixture.playAudio();
      await sleep(0.5);
      await fixture.pauseAudio();

      await fixture.changeSpectrogramAudioSource("http://localhost:3000/example2.flac");
    });

    test("position of indicator after changing spectrogram audio source", async ({ fixture }) => {
      const indicatorPosition = await fixture.indicatorPosition();
      expect(indicatorPosition).toBe(0);
    });

    test("functionality of indicator after changing spectrogram audio source", async ({ fixture }) => {
      const initialPosition = await fixture.indicatorPosition();

      await fixture.playAudio();
      await sleep(1);
      await fixture.pauseAudio();

      const finalPosition = await fixture.indicatorPosition();
      expect(finalPosition).toBeGreaterThan(initialPosition);
    });
  });
});
