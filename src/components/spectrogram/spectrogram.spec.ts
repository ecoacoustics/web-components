import { invokeBrowserMethod } from "../../tests/helpers";
import { SpectrogramComponent } from "./spectrogram";
import { expect } from "../../tests/assertions";
import { singleSpectrogramFixture as test } from "./single-spectrogram.fixture";
import { sleep } from "../../helpers/utilities";

test.describe("unit tests", () => {
  test("play/pause events", async ({ mount, page }) => {
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

    // I have added this timeout to make this test less flakey
    // without this, the test would sometimes fail because the play event
    // does not fire before the pause event
    // TODO: we should correctly await here until the play event is fired
    await page.waitForTimeout(1000);

    await invokeBrowserMethod<SpectrogramComponent>(component, "pause");
    expect(outside).toEqual({ keyboardShortcut: false, play: false });
  });

  test("loading events", async ({ mount, page }) => {
    let loadingEvent: CustomEvent | undefined;
    let loadedEvent: CustomEvent | undefined;

    await mount(SpectrogramComponent, {
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

test.describe("spectrogram", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("play and pausing audio with source slot", async ({ fixture }) => {
    const slot = `<source src="${fixture.audioSource}" type="audio/flac" />`;
    await fixture.updateSlot(slot);

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram(), "play");
    expect(await fixture.isPlayingAudio()).toBe(true);

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram(), "pause");
    expect(await fixture.isPlayingAudio()).toBe(false);
  });

  test("playing and pausing audio with src attribute", async ({ fixture }) => {
    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram(), "play");
    expect(await fixture.isPlayingAudio()).toBe(true);

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram(), "pause");
    expect(await fixture.isPlayingAudio()).toBe(false);
  });
});
