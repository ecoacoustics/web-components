import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import { sleep } from "../../helpers/utilities";

test.describe("single verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.describe("progress bar", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.changeGridSize(3);
    });

    test.describe("progress bar position", () => {
      test("should have correct default position (bottom)", async ({ fixture }) => {
        // We make an assertion to ensure that both the bottom and top progress
        // bars are not visible at the same time.
        await expect(fixture.gridProgressBars()).toHaveCount(1);

        const footerControls = fixture.footerControls();
        const footerProgressBar = footerControls.locator("oe-progress-bar");

        await expect(footerProgressBar).toBeVisible();
      });

      test("should use the default position for an invalid value", async ({ fixture }) => {
        await fixture.changeProgressBarPosition("this is an invalid value 123");

        const footerControls = fixture.footerControls();
        const footerProgressBar = footerControls.locator("oe-progress-bar");

        await expect(fixture.gridProgressBars()).toHaveCount(1);
        await expect(footerProgressBar).toBeVisible();
      });

      test("should have the correct explicit 'bottom' position", async ({ fixture }) => {
        await fixture.changeProgressBarPosition("bottom");

        const footerControls = fixture.footerControls();
        const footerProgressBar = footerControls.locator("oe-progress-bar");

        await expect(fixture.gridProgressBars()).toHaveCount(1);
        await expect(footerProgressBar).toBeVisible();
      });

      test("should have correct 'top' position", async ({ fixture }) => {
        await fixture.changeProgressBarPosition("top");

        const headerControls = fixture.headerControls();
        const headerProgressBar = headerControls.locator("oe-progress-bar");

        await expect(fixture.gridProgressBars()).toHaveCount(1);
        await expect(headerProgressBar).toBeVisible();
      });

      test("should have correct 'hidden' position", async ({ fixture }) => {
        await fixture.changeProgressBarPosition("hidden");
        await expect(fixture.gridProgressBars()).toHaveCount(0);
      });
    });

    test("should not show the completed segment if a partial page of decisions is made", async ({ fixture }) => {
      // make a decision about one of the tiles. Meaning that the grid should
      // not auto-page and the progress bar should not change
      await fixture.subSelect(0);
      await fixture.makeVerificationDecision("true");

      const completedSegments = await fixture.gridProgressCompletedSegment().count();
      const viewHeadSegments = await fixture.gridProgressHeadSegment().count();

      expect(completedSegments).toBe(0);
      expect(viewHeadSegments).toBe(0);
    });

    test("should grow the view segments if a full page of decisions is made", async ({ fixture }) => {
      // by making a decision without sub-selecting, we expect all the tiles to
      // have the decision applied to them, meaning that the grid should auto
      // page and the progress bars completed and head segments should grow
      await fixture.makeVerificationDecision("true");

      const completedSegments = await fixture.gridProgressCompletedSegment().count();

      const expectedViewHeadWidth = await fixture.progressBarValueToPercentage(3);
      const realizedViewHeadWidth = await fixture.progressBarHeadSize();

      expect(completedSegments).toBe(0);
      expect(realizedViewHeadWidth).toBe(expectedViewHeadWidth);
    });

    test("should show the correct tooltips if a full page of decisions is made", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await sleep(1);

      const expectedTooltip = "3 / 30 (10.00%) audio segments completed";
      const completedTooltips = await fixture.gridProgressBarCompletedTooltip().count();
      const realizedViewHeadTooltip = await fixture.progressBarViewHeadTooltip();

      expect(completedTooltips).toBe(0);
      expect(realizedViewHeadTooltip).toBe(expectedTooltip);
    });

    test("should not change the completed segment if the user navigates in history", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();

      const expectedCompletedWidth = await fixture.progressBarValueToPercentage(3);
      const realizedCompletedWidth = await fixture.progressBarCompletedSize();

      expect(realizedCompletedWidth).toBe(expectedCompletedWidth);
    });

    test("should change the view head tooltips if the user navigates in history", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();

      const expectedCompletedTooltip = "3 / 30 (10.00%) audio segments completed (viewing history)";
      const realizedCompletedTooltip = await fixture.progressBarCompletedTooltip();

      // because the user is at the start of the history, we should not have a
      // view head tooltip because there is no view head segment
      const viewHeadTooltips = await fixture.gridProgressBarViewHeadTooltip().count();

      expect(realizedCompletedTooltip).toBe(expectedCompletedTooltip);
      expect(viewHeadTooltips).toBe(0);
    });

    test("should re-grow the view head segment if the user exits history", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();
      await fixture.continueVerifying();

      const expectedViewHeadWidth = await fixture.progressBarValueToPercentage(3);
      const realizedViewHeadWidth = await fixture.progressBarHeadSize();

      expect(realizedViewHeadWidth).toBe(expectedViewHeadWidth);
    });

    test("should have the the correct segment sizes if the user exits history", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();
      await fixture.continueVerifying();

      const completedSegments = await fixture.gridProgressCompletedSegment().count();

      const expectedViewHeadWidth = await fixture.progressBarValueToPercentage(3);
      const realizedViewHeadWidth = await fixture.progressBarHeadSize();

      expect(completedSegments).toBe(0);
      expect(realizedViewHeadWidth).toBe(expectedViewHeadWidth);
    });
  });
});
