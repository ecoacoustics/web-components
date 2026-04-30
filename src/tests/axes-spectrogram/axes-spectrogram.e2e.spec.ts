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
        spectrogramSize: { width: 1000, height: 1000 },
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
        spectrogramSize: { width: 500, height: 1000 },
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
      // For mel scale, this should be 0.1 kHz (100 Hz) for all canvas heights
      // where 100 Hz provides adequate pixel spacing at the low-frequency end.
      expectedFirstYStep: number;
      // Conservative lower bound on how many y-axis ticks should be visible.
      // Mel-scale grids should always show more than a handful of labels even
      // for small canvases.
      minimumYTickCount: number;
    }

    const testCases = [
      {
        spectrogramSize: { width: 500, height: 500 },
        expectedFirstYStep: 0.1,
        minimumYTickCount: 10,
      },
      {
        spectrogramSize: { width: 1000, height: 1000 },
        expectedFirstYStep: 0.1,
        minimumYTickCount: 25,
      },
      {
        spectrogramSize: { width: 1000, height: 500 },
        expectedFirstYStep: 0.1,
        minimumYTickCount: 10,
      },
    ] as const satisfies MelScaleSizeTest[];

    testCases.forEach((testCase) => {
      const humanizedSize = `${testCase.spectrogramSize.width.toString()} x ${testCase.spectrogramSize.height.toString()}`;

      test(`y-axis first step is fine-grained for mel-scale at size ${humanizedSize}`, async ({ fixture }) => {
        await fixture.createWithMelScaleAndSize(testCase.spectrogramSize);

        const realizedYStep = await fixture.yAxisStep();

        // The first step should be significantly finer than 1 kHz.
        // For canvas heights ≥ 500 px the adaptive algorithm selects a 100 Hz
        // fine step, giving a 0.1 kHz difference between the first two labels.
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
