import { axesSpectrogramFixture as test } from "./axes-spectrogram.e2e.fixture";
import { setBrowserAttribute } from "../helpers/helpers";
import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import { expect } from "../assertions";

test.describe("interactions between axes and spectrogram", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test.describe("axis step for different size spectrograms", () => {
    interface SpectrogramSizeTest {
      spectrogramSize: { width: number; height: number };
      expectedXStep: number;
      expectedYStep: number;
      expectedXTickCount: number;
      expectedYTickCount: number;
    }

    const testCases = [
      {
        spectrogramSize: { width: 1000, height: 1500 },
        expectedXStep: 0.2,
        expectedYStep: 0.2,
        expectedXTickCount: 26,
        expectedYTickCount: 56,
      },
      {
        spectrogramSize: { width: 500, height: 500 },
        expectedXStep: 0.5,
        expectedYStep: 0.5,
        expectedXTickCount: 11,
        expectedYTickCount: 23,
      },
      {
        spectrogramSize: { width: 1000, height: 500 },
        expectedXStep: 0.2,
        expectedYStep: 0.5,
        expectedXTickCount: 26,
        expectedYTickCount: 23,
      },
      {
        spectrogramSize: { width: 500, height: 1500 },
        expectedXStep: 0.5,
        expectedYStep: 0.2,
        expectedXTickCount: 11,
        expectedYTickCount: 56,
      },
      // when testing a height of 100px, the height should be clipped to 128px
      // because the spectrogram components canvas has a minimum height of 128px
      {
        spectrogramSize: { width: 100, height: 100 },
        expectedXStep: 5,
        expectedYStep: 2,
        expectedXTickCount: 2,
        expectedYTickCount: 6,
      },
    ] as const satisfies SpectrogramSizeTest[];

    // TODO: add examples for offsets
    testCases.forEach((testCase) => {
      const humanizedSize = `${testCase.spectrogramSize.width.toString()} x ${testCase.spectrogramSize.height.toString()}`;

      test(`x-axis step for size ${humanizedSize}`, async ({ fixture }) => {
        await fixture.createWithSize(testCase.spectrogramSize);

        const expectedXStep = testCase.expectedXStep;
        const realizedXStep = await fixture.xAxisStep();

        // we will run into floating point errors, if we use toBe
        // by using toBeCloseTo, we will allow for a small error
        expect(realizedXStep).toBeCloseTo(expectedXStep);
      });

      test(`y-axis step for size ${humanizedSize}`, async ({ fixture }) => {
        await fixture.createWithSize(testCase.spectrogramSize);

        const expectedYStep = testCase.expectedYStep;
        const realizedYStep = await fixture.yAxisStep();
        expect(realizedYStep).toBeCloseTo(expectedYStep);
      });

      test(`x-axis tick count for size ${humanizedSize}`, async ({ fixture }) => {
        await fixture.createWithSize(testCase.spectrogramSize);
        const expectedXTickCount = testCase.expectedXTickCount;
        await expect(fixture.xAxisTicks()).toHaveCount(expectedXTickCount);
      });

      test(`y-axis tick count for size ${humanizedSize}`, async ({ fixture }) => {
        await fixture.createWithSize(testCase.spectrogramSize);
        const expectedYTickCount = testCase.expectedYTickCount;
        await expect(fixture.yAxisTicks()).toHaveCount(expectedYTickCount);
      });
    });
  });

  test.skip("different spectrogram stretching attributes", () => {
    test.describe("changing the spectrogram src", () => {
      test.beforeEach(async ({ fixture }) => {
        await fixture.create();
        await fixture.changeSpectrogramSrc("/example_34s.flac");
      });

      test("should resize the x-axis correctly", async ({ fixture }) => {
        await expect(fixture.xAxisTicks()).toHaveCount(34);
        await expect(fixture.xGridLines()).toHaveCount(35);
      });

      test("with an offset should resize the axes correctly", async ({ fixture }) => {
        await setBrowserAttribute<SpectrogramComponent>(fixture.spectrogramComponent(), "offset", "2");
        const xAxisLabels = fixture.xAxisLabels();

        await expect(xAxisLabels).toHaveCount(35);
        await expect(xAxisLabels.nth(0)).toHaveText("2");
        await expect(xAxisLabels.nth(-1)).toHaveText("36");
      });
    });
  });

  test.describe("with offset", () => {
    const testOffset = 2;

    test.beforeEach(async ({ fixture }) => {
      await fixture.create(testOffset);
    });

    test("should have the correct x-axes values", async ({ fixture }) => {
      const expectedFirstLabelText = "2.0";
      const expectedLastLabelText = "7.0";
      await fixture.assertAxisRange(expectedFirstLabelText, expectedLastLabelText, "0.0", "11.0");
    });

    // the initial offset created by the fixture is two seconds
    // by changing the offset attribute to three we should see the x-axis change
    test.skip("changing the offset should change the x-axis correctly", async ({ fixture }) => {
      const xFirstText = "14.0";
      const xLastText = "19.0";

      const yFirstText = "0.0";
      const yLastText = "11.0";

      // an offset of 14, the offset is larger than the recording length
      // all components should still work correctly
      await setBrowserAttribute<SpectrogramComponent>(fixture.spectrogramComponent(), "offset", xFirstText);

      await fixture.assertAxisRange(xFirstText, xLastText, yFirstText, yLastText);
    });
  });

  // TODO: finish these tests
  test.describe.skip("with render window", () => {
    const renderWindowXLow = "1";
    const renderWindowXHigh = "3";
    const renderWindowYLow = "100";
    const renderWindowYHigh = "9000";
    const testRenderWindow = `${renderWindowXLow}, ${renderWindowYLow}, ${renderWindowXHigh}, ${renderWindowYHigh}`;

    test.beforeEach(async ({ fixture }) => {
      await fixture.create(undefined, testRenderWindow);
    });

    test("should have the correct axes values", async ({ fixture }) => {
      await fixture.assertAxisRange(renderWindowXLow, renderWindowXHigh, renderWindowYLow, renderWindowYHigh);
    });

    test("changing the render window after creation", async ({ fixture }) => {
      const newXLow = "1";
      const newXHigh = "3";
      const newYLow = "100";
      const newYHigh = "9000";
      const newRenderWindow = `${newXLow}, ${newYLow}, ${newXHigh}, ${newYHigh}`;

      await setBrowserAttribute<SpectrogramComponent>(fixture.spectrogramComponent(), "window" as any, newRenderWindow);

      await fixture.assertAxisRange(newXLow, newXHigh, newYLow, newYHigh);
    });

    // TODO: this test is currently failing because the unitConverters in the
    // spectrogram component are not updating when lit attributes change
    // meaning that the axes component doesn't re-render
    test.skip("changing the offset after creation should change the x-axis correctly", async ({ fixture }) => {
      const expectedFirstTickValue = "2.0";
      const expectedLastTickValue = "7.0";
      await setBrowserAttribute<SpectrogramComponent>(fixture.spectrogramComponent(), "offset", "2");

      await fixture.assertAxisRange(expectedFirstTickValue, expectedLastTickValue, renderWindowYLow, renderWindowYHigh);
    });
  });

  test.describe.skip("with render window and offset", () => {
    const testOffset = 2;

    const renderWindowXLow = "1";
    const renderWindowXHigh = "3";
    const renderWindowYLow = "100";
    const renderWindowYHigh = "9000";
    const testRenderWindow = `${renderWindowXLow}, ${renderWindowYLow}, ${renderWindowXHigh}, ${renderWindowYHigh}`;

    test.beforeEach(async ({ fixture }) => {
      await fixture.create(testOffset, testRenderWindow);
    });

    test("should have the correct axes values", async ({ fixture }) => {
      await fixture.assertAxisRange(renderWindowXLow, renderWindowXHigh, renderWindowYLow, renderWindowYHigh);
    });
  });

  test.describe("mel-scale y-axis grid lines", () => {
    // The mel scale expands the low-frequency region and compresses the
    // high-frequency region. The adaptive tick algorithm should produce
    // finer labels at the bottom (low-frequency end) instead of the 1 kHz
    // steps that the linear algorithm would choose.

    interface MelScaleSizeTest {
      spectrogramSize: { width: number; height: number };
      // The difference (in kHz) between the first two y-axis labels.
      // With the doubled minPixelSpacing threshold, a 500 px canvas selects
      // 200 Hz (0.2 kHz) as the fine step, while a 1000 px canvas still fits
      // 100 Hz (0.1 kHz) at the low-frequency end.
      expectedFirstYStep: number;
      // Conservative lower bound on how many y-axis ticks should be visible.
      // Mel-scale grids should always show more labels than the coarse 1 kHz
      // linear step produces (11 labels for the full 0–11 kHz range).
      minimumYTickCount: number;
    }

    const testCases = [
      {
        spectrogramSize: { width: 500, height: 500 },
        // With doubled minPixelSpacing a 500 px canvas no longer fits 100 Hz
        // (100 Hz ≈ 23.6 px gap vs 27.5 px threshold), so the algorithm selects
        // the next candidate: 200 Hz = 0.2 kHz.
        expectedFirstYStep: 0.2,
        minimumYTickCount: 7,
      },
      {
        spectrogramSize: { width: 1000, height: 1000 },
        // 1000 px canvas has ≈ 47 px per 100 Hz at the low-frequency end, which
        // exceeds the threshold, so 100 Hz = 0.1 kHz is still selected.
        expectedFirstYStep: 0.1,
        minimumYTickCount: 15,
      },
      {
        spectrogramSize: { width: 1000, height: 500 },
        // Height 500 px — same reasoning as the 500 × 500 case above.
        expectedFirstYStep: 0.2,
        minimumYTickCount: 7,
      },
    ] as const satisfies MelScaleSizeTest[];

    testCases.forEach((testCase) => {
      const humanizedSize = `${testCase.spectrogramSize.width.toString()} x ${testCase.spectrogramSize.height.toString()}`;

      test(`y-axis first step is fine-grained for mel-scale at size ${humanizedSize}`, async ({ fixture }) => {
        await fixture.createWithMelScaleAndSize(testCase.spectrogramSize);

        const realizedYStep = await fixture.yAxisStep();

        // The first step should be significantly finer than 1 kHz.
        // The exact step depends on canvas height: 100 Hz for tall canvases
        // (≥ 1000 px) and 200 Hz for medium canvases (500 px).
        expect(realizedYStep).toBeCloseTo(testCase.expectedFirstYStep, 1);
      });

      test(`y-axis has adequate tick density for mel-scale at size ${humanizedSize}`, async ({ fixture }) => {
        await fixture.createWithMelScaleAndSize(testCase.spectrogramSize);

        const tickCount = await fixture.yAxisTicks().count();
        expect(tickCount).toBeGreaterThanOrEqual(testCase.minimumYTickCount);
      });
    });

    test("y-step override is still honoured when mel-scale is active", async ({ fixture }) => {
      // When the user sets a manual y-step, the adaptive algorithm should be
      // bypassed and the specified step should be used exactly.
      await fixture.createWithMelScaleStepOverrideAndSize({ width: 500, height: 500 }, 500);

      const realizedYStep = await fixture.yAxisStep();

      // 500 Hz = 0.5 kHz, as displayed by the 1-decimal-place kHz label
      expect(realizedYStep).toBeCloseTo(0.5, 1);
    });
  });
});
