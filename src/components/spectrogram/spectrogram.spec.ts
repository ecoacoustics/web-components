import {
  catchLocatorEvent,
  getBrowserSignalValue,
  getBrowserValue,
  getElementSize,
  invokeBrowserMethod,
  mockDeviceSize,
  removeBrowserAttribute,
  setBrowserAttribute,
  testBreakpoints,
} from "../../tests/helpers";
import { SpectrogramComponent } from "./spectrogram";
import { expect } from "../../tests/assertions";
import { sleep } from "../../helpers/utilities";
import { singleSpectrogramFixture as test } from "./single-spectrogram.fixture";
import { Pixel } from "../../models/unitConverters";
import { html } from "lit";
import { Size } from "../../models/rendering";

interface SpectrogramSizingTest {
  name: string;
  scaling: string;
  width?: Pixel;
  height?: Pixel;

  expectedWidth?: Pixel;
  expectedHeight?: Pixel;
}

function assertSpectrogramSizing(testCase: SpectrogramSizingTest) {
  test(testCase.name, async ({ fixture }) => {
    if (testCase.width) {
      await fixture.changeSpectrogramWidth(testCase.width);
    }

    if (testCase.height) {
      await fixture.changeSpectrogramHeight(testCase.height);
    }

    await fixture.changeSpectrogramSizing(testCase.scaling);

    const realizedSize = await getElementSize(fixture.spectrogram());
    if (testCase.expectedWidth) {
      expect(realizedSize.width).toEqual(testCase.expectedWidth);
    }

    if (testCase.expectedHeight) {
      expect(realizedSize.height).toEqual(testCase.expectedHeight);
    }
  });
}

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

    // I have added this timeout to make this test less flakey
    // without this, the test would sometimes fail because the play event
    // does not fire before the pause event
    // TODO: we should correctly await here until the play event is fired
    await sleep(1);

    await invokeBrowserMethod<SpectrogramComponent>(component, "pause");
    expect(outside).toEqual({ keyboardShortcut: false, play: false });
  });

  test("loading events", async ({ mount }) => {
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
    await sleep(1);

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
    ] as const satisfies string[];

    for (const source of testedSources) {
      test(`renders ${source} correctly`, async ({ mount, fixture }) => {
        const component = await mount(SpectrogramComponent, {
          props: {
            src: `http://localhost:3000/${source}`,
          },
        });

        await fixture.changeSpectrogramHeight();

        // sleep for 3 seconds to allow the spectrogram to render
        // TODO: there should probably be a better way to do this
        await sleep(3);

        await expect(component).toHaveScreenshot();
      });
    }
  });
});

test.describe.skip("spectrogram sizing", () => {
  const minimumSpectrogramHeight = 128 satisfies Pixel;

  const originalSpectrogramHeight = 704 satisfies Pixel;
  const originalSpectrogramWidth = 1264 satisfies Pixel;

  const viewportWidth = 1264 satisfies Pixel;
  const viewportHeight = 704 satisfies Pixel;

  test.describe("default sizes", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithDefaultSize();
    });

    const defaultSizeTests = [
      {
        name: "should have the correct default sizing for stretch",
        scaling: "stretch",
        expectedWidth: viewportWidth,
        expectedHeight: minimumSpectrogramHeight,
      },
      {
        name: "should have the correct default sizing for natural",
        scaling: "natural",
        expectedWidth: viewportWidth,
        expectedHeight: viewportHeight,
      },
      {
        name: "should have the correct default sizing for original",
        scaling: "original",
        expectedHeight: originalSpectrogramHeight,
        expectedWidth: originalSpectrogramWidth,
      },
    ] as const satisfies SpectrogramSizingTest[];

    for (const testCase of defaultSizeTests) {
      assertSpectrogramSizing(testCase);
    }
  });

  test.describe("sizing overwrites", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create();
    });

    const sizingTests = [
      // original scaling
      {
        name: "should not be able to resize original spectrogram",
        scaling: "original",
        width: 128,
        height: 512,
        expectedWidth: originalSpectrogramWidth,
        expectedHeight: originalSpectrogramHeight,
      },

      // this test exists to ensure that we are not culling spectrogram elements
      // if their width or height is explicitly set to 0
      {
        name: "should not cull an original spectrogram with 0 size",
        scaling: "original",
        width: 0,
        height: 0,
        expectedWidth: originalSpectrogramWidth,
        expectedHeight: originalSpectrogramHeight,
      },

      // stretch scaling
      {
        name: "should be able to change the width of a stretch spectrogram",
        scaling: "stretch",
        width: 887,
        expectedWidth: 887,
        expectedHeight: minimumSpectrogramHeight,
      },
      {
        name: "should be able to change the height of a stretch spectrogram",
        scaling: "stretch",
        height: 887,
        // we make assertions
        expectedWidth: viewportWidth,
        expectedHeight: 887,
      },
      {
        name: "should be able to change the width and height of a stretch spectrogram",
        scaling: "stretch",
        width: 887,
        height: 887,
        expectedWidth: 887,
        expectedHeight: 887,
      },
      {
        name: "should be able to make a stretch spectrogram larger than the viewport container",
        scaling: "stretch",
        width: viewportWidth * 2,
        height: viewportHeight * 2,
        expectedWidth: viewportWidth * 2,
        expectedHeight: viewportHeight * 2,
      },

      // natural scaling
      {
        name: "should constrain natural scaling to width correctly",
        scaling: "natural",
        width: 887,
        expectedWidth: 887,
        expectedHeight: 887,
      },
      {
        name: "should constrain natural scaling to height correctly",
        scaling: "natural",
        height: 887,
        expectedWidth: 887,
        expectedHeight: 887,
      },
      {
        name: "should constrain natural scaling to the minimum width",
        scaling: "natural",
        width: 100,
        height: 200,
        expectedWidth: 100,
        expectedHeight: 100,
      },
      {
        name: "should constrain natural scaling to the minimum height",
        scaling: "natural",
        width: 200,
        height: 100,
        expectedWidth: 100,
        expectedHeight: 100,
      },
    ] as const satisfies SpectrogramSizingTest[];

    for (const testCase of sizingTests) {
      assertSpectrogramSizing(testCase);
    }
  });

  test.describe("dynamic sizing", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithViewportSize();
    });

    test("should correctly resize a STRETCH spectrogram if the window is resized", async ({ fixture }) => {
      await fixture.changeSpectrogramSizing("stretch");

      const initialShape = await getElementSize(fixture.spectrogram());
      expect(initialShape.width).toEqual(testBreakpoints.desktop.width);
      expect(initialShape.height).toEqual(minimumSpectrogramHeight);

      const realizedSize = await getElementSize(fixture.spectrogram());

      expect(realizedSize.width).toEqual(testBreakpoints.mobile.width);
      expect(realizedSize.height).toEqual(initialShape.height);
    });

    test("should correctly resize a NATURAL spectrogram if the window is resized", async ({ fixture }) => {
      await fixture.changeSpectrogramSizing("natural");

      const initialShape = await getElementSize(fixture.spectrogram());
      expect(initialShape.width).toEqual(testBreakpoints.desktop.width);
      expect(initialShape.height).toEqual(testBreakpoints.desktop.height);
    });

    test("should correctly resize NATURAL spectrogram smaller than original spectrogram size", async ({ fixture }) => {
      await fixture.changeSpectrogramSizing("natural");

      const initialShape = await getElementSize(fixture.spectrogram());
      expect(initialShape.width).toEqual(testBreakpoints.desktop.width);
      expect(initialShape.height).toEqual(testBreakpoints.desktop.height);

      mockDeviceSize({ width: 50, height: 50 });

      const realizedSize = await getElementSize(fixture.spectrogram());
      expect(realizedSize.width).toEqual(50);
      expect(realizedSize.height).toEqual(50);
    });

    test("should correctly resize a NATURAL spectrogram when the fft size changes", async ({ fixture }) => {
      await fixture.changeSpectrogramSizing("natural");

      await setBrowserAttribute<SpectrogramComponent>(fixture.spectrogram(), "window-size" as any, "2048");

      const finalSize = await getElementSize(fixture.spectrogram());
      expect(finalSize.width).toEqual(testBreakpoints.desktop.width);
      expect(finalSize.height).toEqual(testBreakpoints.desktop.height);
    });

    test("should not resize an ORIGINAL spectrogram if the window is resized", async ({ fixture }) => {
      await fixture.changeSpectrogramSizing("natural");

      const initialShape = await getElementSize(fixture.spectrogram());
      expect(initialShape.width).toEqual(testBreakpoints.desktop.width);
      expect(initialShape.height).toEqual(testBreakpoints.desktop.height);

      const viewportMock = mockDeviceSize(testBreakpoints.mobile);
      await viewportMock(fixture.page);

      const realizedSize = await getElementSize(fixture.spectrogram());
      expect(realizedSize.width).toEqual(initialShape.width);
      expect(realizedSize.height).toEqual(initialShape.height);
    });
  });

  // We add a bit of chrome to the spectrogram component in these tests so that
  // we can assert that the size targeting the spectrogram canvas will cause the
  // chrome to be added to the canvas size.
  // We expect that the spectrogram host will be slightly larger than the canvas
  // size because of the chrome.
  test.describe("canvas part styling", () => {
    const mockChromeHeight = 20 satisfies Pixel;

    test.beforeEach(async ({ fixture }) => {
      const mockProvider = {
        chromeTop: () => html`<div style="${mockChromeHeight}px">testing123</div>`,
      };

      fixture.addChromeProvider(mockProvider);
    });

    test("should size spectrogram host correctly", async ({ fixture }) => {
      const testedCanvasSize = { width: 512, height: 512 } as const satisfies Size;
      const expectedCanvasSize = {
        width: testedCanvasSize.width,
        height: testedCanvasSize.height + mockChromeHeight,
      };

      await fixture.changeCanvasSize(testedCanvasSize);

      const realizedHostSize = await getElementSize(fixture.spectrogram());
      expect(realizedHostSize).toEqual(expectedCanvasSize);
    });

    test("should size spectrogram canvas to part size", async ({ fixture }) => {
      const testedCanvasSize = { width: 512, height: 512 } as const satisfies Size;

      await fixture.changeCanvasSize(testedCanvasSize);

      const realizedCanvasSize = await getElementSize(fixture.spectrogramCanvas());
      expect(realizedCanvasSize).toEqual(testedCanvasSize);
    });

    // It is possible to create conflicting sizing rules for the spectrogram
    // component by targeting the canvas part and explicitly sizing the
    // spectrogram host.
    // e.g.
    // oe-spectrogram { height: 100px; }
    // oe-spectrogram::part(canvas) { height: 200px; }
    //
    // This would result in the canvas being 200px tall, but the host being
    // 100px tall.
    // We have decided that this is not a valid use case that we want to
    // support and therefore we will not be testing it.
  });
});

test.describe("playing/pausing", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  async function assertCanPlayPause(fixture: any) {
    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram(), "play");
    expect(await fixture.isPlayingAudio()).toEqual(true);

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram(), "pause");
    expect(await fixture.isPlayingAudio()).toEqual(false);
  }

  test("should behave correctly with a src attribute and source slot", async ({ fixture }) => {
    const slot = `<source src="${fixture.audioSource}" type="audio/flac" />`;
    await fixture.updateSlot(slot);
    await assertCanPlayPause(fixture);
  });

  test("should behave correctly pausing audio with only source slot", async ({ fixture }) => {
    const slot = `<source src="${fixture.audioSource}" type="audio/flac" />`;
    await fixture.updateSlot(slot);

    await removeBrowserAttribute<SpectrogramComponent>(fixture.spectrogram(), "src");

    await assertCanPlayPause(fixture);
  });

  test("should behave correctly with only a src attribute", async ({ fixture }) => {
    await assertCanPlayPause(fixture);
  });

  // This test asserts that the high accuracy time processor only starts
  // interpolating time once audio playback has started.
  test.only("should only start playing once the audio starts playing", async ({ fixture }) => {
    // we dispatch a "play" event from the audio element so that if the high
    // accuracy time processor starts interpolating time before the audio starts
    // playing, we will be able to detect it.
    await fixture.spectrogramAudioElement().dispatchEvent("play");
    await sleep(1);

    // I assert that the play event didn't start the audio element playing to
    // make this test more robust.
    // E.g. we do not want the test to fail because the audio element really
    // has started to play.
    await expect(fixture.spectrogramAudioElement()).toHaveJSProperty("paused", true);

    // although the audio element has been dispatched a "play" event, playback
    // has not started yet, so the currentTime should still be 0
    const currentTime = await getBrowserSignalValue<SpectrogramComponent>(fixture.spectrogram(), "currentTime");
    expect(currentTime).toEqual(0);

    // We manually start playing the audio element so that playback begins
    // without dispatching another "play" event which might cause this test to
    // pass when it should not have
    //
    // We expect that the currentTime will start to update because the audio
    // element has started playback.
    await invokeBrowserMethod<HTMLAudioElement>(fixture.spectrogramAudioElement(), "play");

    await sleep(1);

    const updatedCurrentTime = await getBrowserSignalValue<SpectrogramComponent>(fixture.spectrogram(), "currentTime");
    expect(updatedCurrentTime).toBeGreaterThan(0);
  });

  // In the case of slow internet connections, or if the user loses connection
  // during playback, the audio playback might start/ and stop half way through
  // playback.
  // If the high accuracy time processor doesn't correctly identify that
  // playback has stopped, it will continue to update the currentTime of the
  // spectrogram.
  // This test ensures that playback interpolation can correctly rubber band
  // back to the correct playback time if audio playback becomes de-synced from
  // the spectrogram.
  test("should keep the currentTime in sync if the audio elements playback starts and stops", async ({ fixture }) => {
    await invokeBrowserMethod<HTMLAudioElement>(fixture.spectrogram(), "play");
    await sleep(1);

    await expect(fixture.spectrogramAudioElement()).toHaveJSProperty("paused", false);

    // We pause the audio element directly so that the high frequency time
    // processor thinks that the audio is still playing, but the audio element
    // is actually paused.
    await invokeBrowserMethod<HTMLAudioElement>(fixture.spectrogramAudioElement(), "pause");
    await sleep(1);

    await expect(fixture.spectrogramAudioElement()).toHaveJSProperty("paused", true);

    const initialTime = await getBrowserSignalValue<SpectrogramComponent>(fixture.spectrogram(), "currentTime");
    expect(initialTime).toBeGreaterThan(0);

    // we simulate enough passage of time so that time interpolation will
    // rubber band back to the correct paused time
    await sleep(2);

    const finalTime = await getBrowserSignalValue<SpectrogramComponent>(fixture.spectrogram(), "currentTime");
    const expectedTime = await getBrowserValue<HTMLAudioElement>(fixture.spectrogramAudioElement(), "currentTime");

    expect(finalTime).toEqual(expectedTime);
  });
});

test.describe("changing source", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should reset the currentTime if the spectrograms src attribute is changed", async ({ fixture }) => {
    // the spectrogram element starts with a src attribute, therefore we can
    // start playing the original source without needing to change it at the
    // beginning of the tests

    // we wait some time after the audio starts to play so that the currentTime
    // will be a lot greater than 0
    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram(), "play");
    await sleep(1);

    // after changing the source, we wait for a bit so that if the currentTime
    // is still being updated, it will be a lot greater than 0
    const loadedEvent = catchLocatorEvent(fixture.spectrogram(), "loaded");
    await setBrowserAttribute<SpectrogramComponent>(fixture.spectrogram(), "src", fixture.secondaryAudioSource);
    await loadedEvent;

    // I wait 1 second after the spectrogram has loaded to assert that the
    // spectrograms currentTime doesn't keep increasing after the src changes
    await sleep(1);

    const currentTime = await getBrowserSignalValue<SpectrogramComponent>(fixture.spectrogram(), "currentTime");
    expect(currentTime).toEqual(0);
    expect(await fixture.isPlayingAudio()).toEqual(false);
  });

  // The below skipped tests are not passing because of bugs in the spectrogram
  // component.
  // TODO: fix the underlying bugs and enable the tests
  test.skip("should reset the currentTime if the spectrograms changes from src to slotted", async ({ fixture }) => {
    // because the spectrogram element starts with a src attribute, so we can
    // start playing the spectrograms src attribute immediately

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram(), "play");
    await sleep(1);

    // after changing the source, we wait for a bit so that if the currentTime
    // is still being updated, it will be a lot greater than 0
    await fixture.updateSlot(`<source src="${fixture.secondaryAudioSource}" type="audio/flac" />`);
    await sleep(1);

    const currentTime = await getBrowserSignalValue<SpectrogramComponent>(fixture.spectrogram(), "currentTime");
    expect(currentTime).toEqual(0);
    expect(await fixture.isPlayingAudio()).toEqual(false);
  });

  test.skip("should reset the currentTime if the spectrograms slotted source changes", async ({ fixture }) => {
    await removeBrowserAttribute<SpectrogramComponent>(fixture.spectrogram(), "src");
    await fixture.updateSlot(`<source src="${fixture.audioSource}" type="audio/flac" />`);

    await invokeBrowserMethod<SpectrogramComponent>(fixture.spectrogram(), "play");
    await sleep(1);

    // after changing the source, we wait for a bit so that if the currentTime
    // is still being updated, it will be a lot greater than 0
    await fixture.updateSlot(`<source src="${fixture.secondaryAudioSource}" type="audio/flac" />`);
    await sleep(1);

    const currentTime = await getBrowserSignalValue<SpectrogramComponent>(fixture.spectrogram(), "currentTime");
    expect(currentTime).toEqual(0);
    expect(await fixture.isPlayingAudio()).toEqual(false);
  });
});

test.describe("chrome", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should not have any chrome if not specified", async ({ fixture }) => {
    await expect(fixture.chromeContainer("chrome-top")).toBeEmpty();
    await expect(fixture.chromeContainer("chrome-bottom")).toBeEmpty();
    await expect(fixture.chromeContainer("chrome-left")).toBeEmpty();
    await expect(fixture.chromeContainer("chrome-right")).toBeEmpty();
  });
});
