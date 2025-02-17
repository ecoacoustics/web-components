import { axesSpectrogramFixture as test } from "./axes-spectrogram.e2e.fixture";
import { setBrowserAttribute } from "../helpers";
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

    const testCases: SpectrogramSizeTest[] = [
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
    ];

    // TODO: add examples for offsets
    testCases.forEach((testCase: SpectrogramSizeTest) => {
      const humanizedSize = `${testCase.spectrogramSize.width} x ${testCase.spectrogramSize.height}`;

      test(`x-axis step for size ${humanizedSize}`, async ({ fixture }) => {
        await fixture.changeSize(testCase.spectrogramSize);

        const expectedXStep = testCase.expectedXStep;
        const realizedXStep = await fixture.xAxisStep();

        // we will run into floating point errors, if we use toBe
        // by using toBeCloseTo, we will allow for a small error
        expect(realizedXStep).toBeCloseTo(expectedXStep);
      });

      test(`y-axis step for size ${humanizedSize}`, async ({ fixture }) => {
        await fixture.changeSize(testCase.spectrogramSize);

        const expectedYStep = testCase.expectedYStep;
        const realizedYStep = await fixture.yAxisStep();
        expect(realizedYStep).toBeCloseTo(expectedYStep);
      });

      test(`x-axis tick count for size ${humanizedSize}`, async ({ fixture }) => {
        await fixture.changeSize(testCase.spectrogramSize);

        const expectedXTickCount = testCase.expectedXTickCount;
        const xAxisTicks = await fixture.xAxisTicks();
        const realizedXTickCount = xAxisTicks.length;
        expect(realizedXTickCount).toBeCloseTo(expectedXTickCount);
      });

      test(`y-axis tick count for size ${humanizedSize}`, async ({ fixture }) => {
        await fixture.changeSize(testCase.spectrogramSize);

        const expectedYTickCount = testCase.expectedYTickCount;
        const yAxisTicks = await fixture.yAxisTicks();
        const realizedYTickCount = yAxisTicks.length;
        expect(realizedYTickCount).toBeCloseTo(expectedYTickCount);
      });
    });
  });

  test.skip("different spectrogram stretching attributes", () => {
    test.describe("changing the spectrogram src", () => {
      test.beforeEach(async ({ fixture }) => {
        await fixture.changeSpectrogramSrc("/example_34s.flac");
      });

      test("should resize the x-axis correctly", async ({ fixture }) => {
        const expectedNumberOfGridLines = 34;
        const expectedNumberOfTicks = 35;

        const xAxisTicks = await fixture.xAxisTicks();
        const xAxisGridLines = await fixture.xGridLines();

        expect(xAxisTicks).toHaveLength(expectedNumberOfTicks);
        expect(xAxisGridLines).toHaveLength(expectedNumberOfGridLines);
      });

      test("with an offset should resize the axes correctly", async ({ fixture }) => {
        await setBrowserAttribute<SpectrogramComponent>(fixture.spectrogramComponent(), "offset", "2");
        const xAxisLabels = await fixture.xAxisLabels();

        expect(xAxisLabels).toHaveLength(35);
        expect(xAxisLabels.at(0)).toBe(2);
        expect(xAxisLabels.at(-1)).toBe(36);
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
  // test.describe("with render window", () => {
  //   const renderWindowXLow = "1";
  //   const renderWindowXHigh = "3";
  //   const renderWindowYLow = "100";
  //   const renderWindowYHigh = "9000";
  //   const testRenderWindow = `${renderWindowXLow}, ${renderWindowYLow}, ${renderWindowXHigh}, ${renderWindowYHigh}`;

  //   test.beforeEach(async ({ fixture }) => {
  //     await fixture.create(undefined, testRenderWindow);
  //   });

  //   test("should have the correct axes values", async ({ fixture }) => {
  //     await fixture.assertAxisRange(renderWindowXLow, renderWindowXHigh, renderWindowYLow, renderWindowYHigh);
  //   });

  //   test("changing the render window after creation", async ({ fixture }) => {
  //     const newXLow = "1";
  //     const newXHigh = "3";
  //     const newYLow = "100";
  //     const newYHigh = "9000";
  //     const newRenderWindow = `${newXLow}, ${newYLow}, ${newXHigh}, ${newYHigh}`;

  //     await setBrowserAttribute<SpectrogramComponent>(fixture.spectrogramComponent(), "window" as any, newRenderWindow);

  //     await fixture.assertAxisRange(newXLow, newXHigh, newYLow, newYHigh);
  //   });

  //   // TODO: this test is currently failing because the unitConverters in the
  //   // spectrogram component are not updating when lit attributes change
  //   // meaning that the axes component doesn't re-render
  //   test.skip("changing the offset after creation should change the x-axis correctly", async ({ fixture }) => {
  //     const expectedFirstTickValue = "2.0";
  //     const expectedLastTickValue = "7.0";
  //     await setBrowserAttribute<SpectrogramComponent>(fixture.spectrogramComponent(), "offset", "2");

  //     await fixture.assertAxisRange(expectedFirstTickValue, expectedLastTickValue, renderWindowYLow, renderWindowYHigh);
  //   });
  // });

  // test.describe("with render window and offset", () => {
  //   const testOffset = 2;

  //   const renderWindowXLow = "1";
  //   const renderWindowXHigh = "3";
  //   const renderWindowYLow = "100";
  //   const renderWindowYHigh = "9000";
  //   const testRenderWindow = `${renderWindowXLow}, ${renderWindowYLow}, ${renderWindowXHigh}, ${renderWindowYHigh}`;

  //   test.beforeEach(async ({ fixture }) => {
  //     await fixture.create(testOffset, testRenderWindow);
  //   });

  //   test("should have the correct axes values", async ({ fixture }) => {
  //     await fixture.assertAxisRange(renderWindowXLow, renderWindowXHigh, renderWindowYLow, renderWindowYHigh);
  //   });
  // });
});
