import {
  changeToMobile,
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

test.describe("spectrogram sizing", () => {
  const minimumSpectrogramHeight = 128 satisfies Pixel;

  const originalSpectrogramHeight = 704 satisfies Pixel;
  const originalSpectrogramWidth = 1264 satisfies Pixel;

  const viewportWidth = 1264 satisfies Pixel;
  const viewportHeight = 704 satisfies Pixel;

  test.describe("default sizes", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithDefaultSize();
    });

    const defaultSizeTests: SpectrogramSizingTest[] = [
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
    ];

    for (const testCase of defaultSizeTests) {
      assertSpectrogramSizing(testCase);
    }
  });

  test.describe("sizing overwrites", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create();
    });

    const sizingTests: SpectrogramSizingTest[] = [
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
    ];

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

      changeToMobile(fixture.page);

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

  test("should behave correctly with src attribute", async ({ fixture }) => {
    await assertCanPlayPause(fixture);
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
