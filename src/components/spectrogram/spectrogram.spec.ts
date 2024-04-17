import { expect, test } from "@sand4rt/experimental-ct-web";
import { singleSpectrogramFixture } from "./singleSpectrogram.fixture";
import { invokeBrowserMethod } from "../../tests/helpers";
import { Spectrogram } from "./spectrogram";

test.describe("unit tests", () => {
  test("play/pause events", async ({ mount }) => {
    let outside: CustomEvent<boolean> | undefined;
    const component = await mount(Spectrogram, {
      props: {
        src: "/example.flac",
      },
      on: {
        play: (event) => {
          outside = event;
        },
      },
    });

    await invokeBrowserMethod<Spectrogram>(component, "play");
    expect(outside).toBe(true);

    await invokeBrowserMethod<Spectrogram>(component, "pause");
    expect(outside).toBe(false);
  });
});

singleSpectrogramFixture.describe("spectrogram", () => {
  singleSpectrogramFixture.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  singleSpectrogramFixture("play and pausing audio with source slot", async ({ fixture }) => {
    const slot = `<source src="${fixture.audioSource}" type="audio/flac" />`;
    await fixture.updateSlot(slot);

    await invokeBrowserMethod<Spectrogram>(fixture.spectrogram, "play");
    expect(await fixture.isPlayingAudio()).toBe(true);

    await invokeBrowserMethod<Spectrogram>(fixture.spectrogram, "pause");
    expect(await fixture.isPlayingAudio()).toBe(false);
  });

  singleSpectrogramFixture("playing and pausing audio with src attribute", async ({ fixture }) => {
    await invokeBrowserMethod<Spectrogram>(fixture.spectrogram, "play");
    expect(await fixture.isPlayingAudio()).toBe(true);

    await invokeBrowserMethod<Spectrogram>(fixture.spectrogram, "pause");
    expect(await fixture.isPlayingAudio()).toBe(false);
  });
});
