import { invokeBrowserMethod, setBrowserAttribute } from "../../tests/helpers";
import { SpectrogramComponent } from "./spectrogram";
import { expect, test } from "../../tests/assertions";
import { singleSpectrogramFixture as fixture } from "./single-spectrogram.fixture";
import { sleep } from "../../helpers/utilities";

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
    expect(outside).toEqual({ keyboardShortcut: false, play: true });

    await invokeBrowserMethod<SpectrogramComponent>(component, "pause");
    expect(outside).toEqual({ keyboardShortcut: false, play: false });
  });

  test("loading events", async ({ mount, page }) => {
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

    // TODO: this is a hacky way to wait for the loading event to fire, there should be a better way
    await page.waitForTimeout(1000);

    expect(loadingEvent).toBeDefined();
    expect(loadedEvent).toBeDefined();
  });

  // in these tests we use snapshot testing which means that whenever a visual
  // change is made to the rendering, the tests will fail, and the only way
  // to get them to stop failing is to update the "correct" snapshot
  // which involves getting it past code review
  test.describe("spectrogram rendering", () => {
    const testedSources = [
      "120hz.wav",
      "diagnostic.wav",
      "example.flac",
      "example.wav",
      "example2.flac",
      "example_34s.flac",
      "merged_diagnostic.wav",
    ];

    for (const source of testedSources) {
      test(`renders ${source} correctly`, async ({ mount }) => {
        const component = await mount(SpectrogramComponent, {
          props: {
            src: `http://localhost:3000/${source}`,
          },
        });

        // sleep for 3 seconds to allow the spectrogram to render
        // TODO: there should probably be a better way to do this
        await sleep(3);

        await expect(component).toHaveScreenshot();
      });
    }
  });
});

fixture.describe("spectrogram", () => {
  fixture.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  fixture("play and pausing audio with source slot", async ({ fixture }) => {
    const slot = `<source src="${fixture.audioSource}" type="audio/flac" />`;
    await fixture.updateSlot(slot);

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram, "play");
    expect(await fixture.isPlayingAudio()).toBe(true);

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram, "pause");
    expect(await fixture.isPlayingAudio()).toBe(false);
  });

  fixture("playing and pausing audio with src attribute", async ({ fixture }) => {
    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram, "play");
    expect(await fixture.isPlayingAudio()).toBe(true);

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram, "pause");
    expect(await fixture.isPlayingAudio()).toBe(false);
  });
});
