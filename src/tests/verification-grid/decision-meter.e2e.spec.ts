import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";

test.describe("decision meter", () => {
  test.describe("classification task", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithClassificationTask();
      await fixture.changeGridSize(3);
    });

    test("should have the correct number of segments in the progress meter", async ({ fixture }) => {
      await expect(fixture.gridTileTaskMeterSegments()).toHaveCount(3);
    });

    test("should have the correct colors without a decision", async ({ fixture }) => {
      const gridSize = await fixture.getGridSize();
      const expectedColors = Array.from({ length: gridSize }).fill(await fixture.panelColor());
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips without a decision", async ({ fixture }) => {
      const expectedTooltips = ["car (no decision)", "koala (no decision)", "bird (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    test("should change to the correct colors when a decision is made", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);

      const expectedColors = [
        await fixture.getClassificationColor("car", true),
        await fixture.panelColor(),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is made", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);

      const expectedTooltips = ["car (true)", "koala (no decision)", "bird (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    test("should have the correct colors when multiple decisions are made", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.makeClassificationDecision("koala", true);

      const expectedColors = [
        await fixture.getClassificationColor("car", true),
        await fixture.getClassificationColor("koala", true),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when multiple decisions are made", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.makeClassificationDecision("koala", false);

      const expectedTooltips = ["car (true)", "koala (false)", "bird (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    test("should change colors when a the decision is changed", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.makeClassificationDecision("car", false);

      const expectedColors = [
        await fixture.getClassificationColor("car", false),
        await fixture.panelColor(),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is changed", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.makeClassificationDecision("car", false);

      const expectedTooltips = ["car (false)", "koala (no decision)", "bird (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    // these skip tests also assert that the progress meter behaves correctly
    // when navigating in history
    test("should have the correct colors when a decision is skipped", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.skipButton().click();

      // when the skip button is clicked, the next page rendered
      // therefore, if we want to see that the correct colors were applied, we
      // have to navigate back in history
      await fixture.viewPreviousHistoryPage();

      const expectedColors = [
        await fixture.getClassificationColor("car", true),
        await fixture.skipColor(),
        await fixture.skipColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is skipped", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.skipButton().click();

      // when the skip button is clicked, the next page rendered
      // therefore, if we want to see that the correct colors were applied, we
      // have to navigate back in history
      await fixture.viewPreviousHistoryPage();

      const expectedTooltips = ["car (true)", "koala (skip)", "bird (skip)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });
  });

  test.describe("verification task", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithVerificationTask();
    });

    test("should have the correct number of segments", async ({ fixture }) => {
      await expect(fixture.gridTileTaskMeterSegments()).toHaveCount(1);
    });

    test("should have the correct colors when a decision is made", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();

      const expectedColors = [await fixture.getVerificationColor("true")];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is made", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();

      const expectedTooltips = ["verification: koala (true)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    // Because skip decisions are handled slightly differently and there is a
    // bit of tech debt from the days when they weren't an actual decision
    // component, we have seen bugs where only skip decisions fail to show
    // correctly in the progress meter.
    test("should show skip decisions correctly", async ({ fixture }) => {
      await fixture.skipButton().click();

      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual([await fixture.skipColor()]);

      const progressMeterTooltips = await fixture.progressMeterTooltips();
      expect(progressMeterTooltips).toEqual(["verification: koala (skip)"]);
    });
  });

  test.describe("mixed classification and verification tasks", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create(`
        <oe-verification verified="true">Positive</oe-verification>
        <oe-verification verified="false">Negative</oe-verification>

        <oe-classification tag="car">Car</oe-classification>
        <oe-classification tag="bird">Bird</oe-classification>
        <oe-classification tag="cat">Cat</oe-classification>
			`);
    });

    test("should have the correct number of segments", async ({ fixture }) => {
      await expect(fixture.gridTileTaskMeterSegments()).toHaveCount(4);
    });

    // make a verification decision and then make a classification decision
    // we should see that the progress meter is updated correctly
    test("should have the correct colors when decisions are made", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.makeClassificationDecision("car", false);

      const expectedColors = [
        await fixture.getVerificationColor("true"),
        await fixture.getClassificationColor("car", false),
        await fixture.panelColor(),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when decisions are made", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.makeClassificationDecision("car", false);

      const expectedTooltips = ["verification: koala (true)", "car (false)", "bird (no decision)", "cat (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });
  });

  test.describe("compound tasks", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithCompoundTask();
    });

    test("should have the correct number of progress meter segments", async ({ fixture }) => {
      await expect(fixture.gridTileTaskMeterSegments()).toHaveCount(2);
    });

    test("should have the appropriate color while the 'when' condition doesn't pass", async ({ fixture }) => {
      await expect(fixture.gridTileTaskMeterSegments().nth(0)).toHaveCSS("background", await fixture.panelColor());
      await expect(fixture.gridTileTaskMeterSegments().nth(1)).toHaveCSS(
        "background",
        await fixture.notRequiredColor(),
      );
    });

    test("should have the appropriate color if a tag is corrected", async ({ fixture }) => {
      const testedTileIndex = 0;
      await fixture.subSelect(testedTileIndex);

      // We have to make a false decision color before making a tag correction
      // because the "oe-tag-prompt" component has a "when" condition that keeps
      // the component disabled until a false decision is made.
      await fixture.makeVerificationDecision("false");

      await fixture.makeNewTagDecision("Noisy Miner");

      const expectedColors = [await fixture.getVerificationColor("false"), await fixture.getNewTagColor()];
      const realizedColors = await fixture.progressMeterColors(testedTileIndex);
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have no action when closing the tag correction popup", () => {});
  });
});
