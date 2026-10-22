import { getBrowserValue } from "../helpers/helpers";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import { ProgressBar } from "../../components/progress-bar/progress-bar";

test.describe("while the initial bootstrap dialog is open", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.createWithBootstrap();
  });

  test("should show an initial bootstrap dialog", async ({ fixture }) => {
    const isBootstrapDialogOpen = await fixture.isBootstrapDialogOpen();
    expect(isBootstrapDialogOpen).toBe(true);
  });

  test("should not be able to sub-select grid tiles with keyboard shortcuts", async ({ fixture }) => {
    // we press Alt+1 because it will always be the first tile in the grid
    // and will therefore always exist
    await fixture.gridComponent().press("Alt+1");
    const selectedTiles = await fixture.selectedTileIndexes();
    expect(selectedTiles).toHaveLength(0);
  });

  test("should not be able to make decisions with keyboard shortcuts", async ({ fixture }) => {
    await fixture.gridComponent().press("Y");
    const verificationHead = await fixture.getVerificationHead();
    expect(verificationHead).toEqual(0);
  });
});

test.describe("single verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.describe("initial state", () => {
    test("should have the correct decisions", async ({ fixture }) => {
      // This test doesn't work on MacOS CI because the skip button is
      // incorrectly prepended to the start of the decision button list.
      // I have manually verified that this bug doesn't exist on real devices.
      //
      // TODO: Find out why CI has the incorrect order and fix this test.
      test.skip(!!process.env.CI && process.platform === "darwin");

      const expectedDecisions = ["True", "False", "Skip"];
      const decisions = await fixture.availableDecision();
      expect(decisions).toEqual(expectedDecisions);
    });

    test("should not show decision highlights", async ({ fixture }) => {
      const initialDecisionHighlights = await fixture.highlightedTiles();
      expect(initialDecisionHighlights).toHaveLength(0);
    });

    test("should not start in fullscreen mode", async ({ fixture }) => {
      const fullscreenState = await fixture.isFullscreen();
      expect(fullscreenState).toBe(false);
    });

    test("should set the correct property values in the progress bar", async ({ fixture }) => {
      const expectedTotal = 30;
      const expectedCompleted = 0;
      const expectedHistoryHeadOffset = 0;

      const progressBar = fixture.gridProgressBars().first();
      const realizedTotal = await getBrowserValue<ProgressBar>(progressBar, "total");
      const realizedCompleted = await getBrowserValue<ProgressBar>(progressBar, "completed");
      const realizedHistoryHeadOffset = await getBrowserValue<ProgressBar>(progressBar, "historyHead");

      expect(realizedTotal).toBe(expectedTotal);
      expect(realizedCompleted).toBe(expectedCompleted);
      expect(realizedHistoryHeadOffset).toBe(expectedHistoryHeadOffset);
    });

    test("should not have progress meter segments", async ({ fixture }) => {
      const completedSegments = await fixture.gridProgressCompletedSegment().count();
      const viewHeadSegments = await fixture.gridProgressHeadSegment().count();

      expect(completedSegments).toBe(0);
      expect(viewHeadSegments).toBe(0);
    });

    test("should not have any applied decisions", async ({ fixture }) => {
      const gridDecisions = await fixture.gridDecisions();
      expect(gridDecisions).toHaveLength(0);
    });

    test("should be automatically focused", async ({ fixture }) => {
      const isGridFocused = await fixture.gridComponent().evaluate((gridElement) => {
        const isComponentFocused = document.activeElement?.matches("oe-verification-grid");
        const isGridFocused = gridElement.shadowRoot?.activeElement?.matches("#grid-container");

        return isComponentFocused && isGridFocused;
      });

      expect(isGridFocused).toBe(true);
    });
  });
});

test.describe("single verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.page.setViewportSize({ width: 1920, height: 1080 });
  });

  // unlike the initial bootstrap dialog, these tests assert that the bootstrap dialog
  // explicitly opened by the user (through the question mark button) behaves
  // correctly
  test.describe("bootstrap dialog", () => {
    const advancedShortcutSlideTitle = "Keyboard shortcuts";

    test("should open advanced shortcuts when the help button is clicked on desktop", async ({ fixture }) => {
      await fixture.changeToDesktop();
      await fixture.bootstrapDialogButton().click();

      const isBootstrapDialogOpen = await fixture.isBootstrapDialogOpen();
      expect(isBootstrapDialogOpen).toBe(true);

      const slideTitle = fixture.bootstrapSlideTitle();
      await expect(slideTitle).toHaveTrimmedText(advancedShortcutSlideTitle);
    });

    // If the user is on a mobile device, there is no purpose in opening the
    // advanced shortcuts bootstrap dialog because they cannot use the keyboard
    // therefore, if the user clicks on the help button while on a mobile, we
    // expect that the user is taken straight to the tutorial modal
    test("should open the tutorial bootstrap when the help button is clicked on mobile", async ({ fixture }) => {
      await fixture.changeToMobile();
      await fixture.bootstrapDialogButton().click();

      const isBootstrapDialogOpen = await fixture.isBootstrapDialogOpen();
      expect(isBootstrapDialogOpen).toBe(true);

      const bootstrapTitle = fixture.bootstrapSlideTitle();
      await expect(bootstrapTitle).not.toHaveTrimmedText(advancedShortcutSlideTitle);
    });
  });
});

test.describe("single verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.page.setViewportSize({ width: 1920, height: 1080 });
  });

  // during progressive creation, individual elements will be added to the
  // document, meaning that the verification grid is in various invalid states
  test.describe("progressive creation of a verification grid", () => {});
});
