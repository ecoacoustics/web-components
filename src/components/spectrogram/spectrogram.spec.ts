import { test } from "@sand4rt/experimental-ct-web";
import { singleSpectrogramFixture } from "./single-spectrogram.fixture";
import { invokeBrowserMethod, setBrowserAttribute } from "../../tests/helpers";
import { SpectrogramComponent } from "./spectrogram";
import { expect } from "../../tests/assertions";

test.describe("unit tests", () => {
  test("play/pause events", async ({ mount }) => {
    let outside: CustomEvent<boolean> | undefined;
    const component = await mount(SpectrogramComponent, {
      props: {
        src: "http://localhost:3000/example.flac",
      },
      on: {
        play: (event: CustomEvent<boolean>) => {
          outside = event;
        },
      },
    });

    await invokeBrowserMethod<SpectrogramComponent>(component, "play");
    expect(outside).toBe(true);

    await invokeBrowserMethod<SpectrogramComponent>(component, "pause");
    expect(outside).toBe(false);
  });

  test("loading events", async ({ mount }) => {
    let loadingEvent: CustomEvent | undefined;
    let loadedEvent: CustomEvent | undefined;

    const component = await mount(SpectrogramComponent, {
      props: {
        src: "http://localhost:3000/example.flac",
      },
      on: {
        loading: (event) => {
          loadingEvent = event;
        },
        loaded: (event) => {
          loadedEvent = event;
        },
      },
    });

    await setBrowserAttribute<SpectrogramComponent>(component, "src", "/example2.flac");

    expect(loadingEvent).toBeDefined();
    expect(loadedEvent).toBeDefined();
  });
});

singleSpectrogramFixture.describe("spectrogram", () => {
  singleSpectrogramFixture.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  singleSpectrogramFixture("play and pausing audio with source slot", async ({ fixture }) => {
    const slot = `<source src="${fixture.audioSource}" type="audio/flac" />`;
    await fixture.updateSlot(slot);

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram, "play");
    expect(await fixture.isPlayingAudio()).toBe(true);

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram, "pause");
    expect(await fixture.isPlayingAudio()).toBe(false);
  });

  singleSpectrogramFixture("playing and pausing audio with src attribute", async ({ fixture }) => {
    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram, "play");
    expect(await fixture.isPlayingAudio()).toBe(true);

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram, "pause");
    expect(await fixture.isPlayingAudio()).toBe(false);
  });
});
