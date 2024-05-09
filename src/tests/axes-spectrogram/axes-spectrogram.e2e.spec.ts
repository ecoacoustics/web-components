import { expect } from "@playwright/test";
import { axesSpectrogramFixture as test } from "./axes-spectrogram.fixture";
import { setBrowserAttribute } from "../helpers";
import { Spectrogram } from "../../components/spectrogram/spectrogram";

test.describe("interactions between axes and spectrogram", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test.describe("5 second recording", () => {
    // because the example audio recording that we are testing against is 5 seconds
    // the tens fraction is one, meaning that the correct step is one
    test("x-axis step should be 1 for a 5 second recording", async ({ fixture }) => {
      const expectedXAxisStep = 1;
      const realizedXAxisStep = await fixture.xAxisStep();

      await expect(realizedXAxisStep).toBe(expectedXAxisStep);
    });

    test("y-axis step should be 1000 for a max niquist of 24000", async ({ fixture }) => {
      const expectedYAxisStep = 1000;
      const realizedYAxisStep = await fixture.yAxisStep();

      await expect(realizedYAxisStep).toBe(expectedYAxisStep);
    });

    test("x-axis should have 6 ticks for a 5 second recording", async ({ fixture }) => {
      const expectedNumberOfTicks = 6;
      const xAxisTicks = await fixture.xAxisTicks();
      const realizedNumberOfTicks = await xAxisTicks.length;

      await expect(realizedNumberOfTicks).toBe(expectedNumberOfTicks);
    });

    test("y-axis should have 11 ticks for a max niquist of 24000", async ({ fixture }) => {
      const expectedNumberOfTicks = 12;
      const yAxisTicks = await fixture.yAxisTicks();
      const realizedNumberOfTicks = await yAxisTicks.length;

      await expect(realizedNumberOfTicks).toBe(expectedNumberOfTicks);
    });

    test("x-axis should have 5 grid lines for a 5 second recording", async ({ fixture }) => {
      const expectedNumberOfGridLines = 5;
      const xGridLines = await fixture.xGridLines();
      const realizedNumberOfGridLines = await xGridLines.length;

      await expect(realizedNumberOfGridLines).toBe(expectedNumberOfGridLines);
    });

    test("y-axis should have 11 grid lines for a max niquist of 24000", async ({ fixture }) => {
      const expectedNumberOfGridLines = 11;
      const yGridLines = await fixture.yGridLines();
      const realizedNumberOfGridLines = await yGridLines.length;

      await expect(realizedNumberOfGridLines).toBe(expectedNumberOfGridLines);
    });

    test("changing the offset after creation should change the x-axis correctly", async ({ fixture }) => {
      const expectedFirstTickValue = "2.0";
      const expectedLastTickValue = "7.0";
      
      await setBrowserAttribute<Spectrogram>(fixture.spectrogramComponent(), "offset", "2");

      const xAxisLabels = await fixture.xAxisLabels();

      await expect(xAxisLabels.at(0)).toBe(expectedFirstTickValue);
      await expect(xAxisLabels.at(-1)).toBe(expectedLastTickValue);
    });
  });

  test.describe("changing the spectrogram src", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.changeSpectrogramSrc("/example_34s.flac");
    });

    test("should resize the x-axis correctly", async ({ fixture }) => {
      const expectedNumberOfGridLines = 34;
      const expectedNumberOfTicks = 35;

      const xAxisTicks = await fixture.xAxisTicks();
      const xAxisGridLines = await fixture.xGridLines();

      await expect(xAxisTicks).toHaveLength(expectedNumberOfTicks);
      await expect(xAxisGridLines).toHaveLength(expectedNumberOfGridLines);
    });

    test("with an offset should resize the axes correctly", async ({ fixture }) => {
      await setBrowserAttribute<Spectrogram>(fixture.spectrogramComponent(), "offset", "2");
      const xAxisLabels = await fixture.xAxisLabels();

      await expect(xAxisLabels).toHaveLength(35);
      await expect(xAxisLabels.at(0)).toBe(2);
      await expect(xAxisLabels.at(-1)).toBe(36);
    });
  });

  test.describe("with offset", () => {
    const testOffset = 2;

    test.beforeEach(async ({ fixture }) => {
      await fixture.create(testOffset);
    });

    test("should have the correct x-axes values", async ({ fixture }) => {
      const xAxisLabels = await fixture.xAxisLabels();

      // the audio recordings length is five seconds, therefore, the last axis tick
      // should be the length incremented by the offset (two)
      await expect(xAxisLabels.at(0)).toBe("2.0");
      await expect(xAxisLabels.at(-1)).toBe("7.0");
      await expect(xAxisLabels).toHaveLength(6);
    });

    // the initial offset created by the fixture is two seconds
    // by changing the offset attribute to three we should see the x-axis change
    test("changing the offset should change the x-axis correctly", async ({ fixture }) => {
      // an offset of 14, the offset is larger than the recording length
      // all components should still work correctly
      setBrowserAttribute<Spectrogram>(fixture.spectrogramComponent(), "offset", "14");

      const xAxisLabels = await fixture.xAxisLabels();

      await expect(xAxisLabels.at(0)).toBe("14.0");
      await expect(xAxisLabels.at(-1)).toBe("19.0");
    });
  });

  test.describe("with render window", () => {
    const testRenderWindow = "1, 100, 3, 9000";

    test.beforeEach(async ({ fixture }) => {
      await fixture.create(undefined, testRenderWindow);
    });

    test("should have the correct axes values", async ({ fixture }) => {
      const xAxisLabels = await fixture.xAxisLabels();
      const yAxisLabels = await fixture.yAxisLabels();

      await expect(xAxisLabels.at(0)).toBe("1.0");
      await expect(xAxisLabels.at(-1)).toBe("3.0");

      await expect(yAxisLabels.at(0)).toBe("100");
      await expect(yAxisLabels.at(-1)).toBe("9000");
    });

    test("changing the render window should change the axes correctly", async ({ fixture }) => {
      setBrowserAttribute<any>(fixture.spectrogramComponent(), "window", "1, 100, 3, 9000");

      const xAxisLabels = await fixture.xAxisLabels();
      const yAxisLabels = await fixture.yAxisLabels();

      await expect(xAxisLabels.at(0)).toBe("1.0");
      await expect(xAxisLabels.at(-1)).toBe("3.0");

      await expect(yAxisLabels.at(0)).toBe("100");
      await expect(yAxisLabels.at(-1)).toBe("9000");
    });
  });

  test.describe("with render window and offset", () => {
    const testOffset = 2;
    const testRenderWindow = "1, 100, 3, 9000";

    test.beforeEach(async ({ fixture }) => {
      await fixture.create(testOffset, testRenderWindow);
    });

    test("should have the correct axes values", async ({ fixture }) => {
      const xAxisLabels = await fixture.xAxisLabels();
      const yAxisLabels = await fixture.yAxisLabels();

      // TODO: figure out if this is the correct behavior
      await expect(xAxisLabels.at(0)).toBe("1.0");
      await expect(xAxisLabels.at(-1)).toBe("3.0");

      await expect(yAxisLabels.at(0)).toBe("100");
      await expect(yAxisLabels.at(-1)).toBe("9000");
    });
  });
});
