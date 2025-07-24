import { Size } from "../../models/rendering";
import { GridShape } from "../../helpers/controllers/dynamic-grid-sizes";
import {
  catchLocatorEvent,
  DeviceMock,
  getBrowserValue,
  getEventLogs,
  logEvent,
  mockDeviceSize,
  pressKey,
  setBrowserAttribute,
  testBreakpoints,
} from "../helpers";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import { SubjectWrapper } from "../../models/subject";
import {
  DOWN_ARROW_KEY,
  END_KEY,
  ESCAPE_KEY,
  HOME_KEY,
  LEFT_ARROW_KEY,
  RIGHT_ARROW_KEY,
  UP_ARROW_KEY,
} from "../../helpers/keyboard";
import { Pixel } from "../../models/unitConverters";
import { DecisionOptions } from "../../models/decisions/decision";
import { ProgressBar } from "../../components/progress-bar/progress-bar";
import { MousePosition, VerificationGridComponent } from "../../components/verification-grid/verification-grid";
import { VerificationGridTileComponent } from "../../components/verification-grid-tile/verification-grid-tile";
import { sleep } from "../../helpers/utilities";

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
    const selectedTiles = await fixture.selectedTiles();
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

  // unlike the initial bootstrap dialog, these tests assert that the bootstrap dialog
  // explicitly opened by the user (through the question mark button) behaves
  // correctly
  test.describe("bootstrap dialog", () => {
    const advancedShortcutSlideTitle = "Keyboard shortcuts";

    test("should open advanced shortcuts when the help button is clicked on desktop", async ({ fixture }) => {
      await fixture.changeToDesktop();
      await fixture.openBootstrapDialog();

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
      await fixture.openBootstrapDialog();

      const isBootstrapDialogOpen = await fixture.isBootstrapDialogOpen();
      expect(isBootstrapDialogOpen).toBe(true);

      const bootstrapTitle = fixture.bootstrapSlideTitle();
      await expect(bootstrapTitle).not.toHaveTrimmedText(advancedShortcutSlideTitle);
    });
  });

  test.describe("changing attributes", () => {
    test.describe("changing the grid size", () => {
      test("should react correctly to changing the grid size", async ({ fixture }) => {
        const expectedGridSize = 1;
        await fixture.changeGridSize(expectedGridSize);
        const gridSize = await fixture.getGridSize();
        expect(gridSize).toEqual(expectedGridSize);
      });

      test("should not allow a grid size that is a string", async ({ fixture }) => {
        const initialGridSize = await fixture.getGridSize();
        const testGridSize = "this-is-not-a-number";

        await setBrowserAttribute(
          fixture.gridComponent(),
          "grid-size" as keyof VerificationGridComponent,
          testGridSize,
        );

        // because we requested an invalid grid size, we should see that the
        // grid size property does not change
        const realizedGridSize = await fixture.getGridSize();
        expect(realizedGridSize).toBe(initialGridSize);
      });

      test("should not allow a grid size that is a negative number", async ({ fixture }) => {
        const initialGridSize = await fixture.getGridSize();
        const testGridSize = -12;

        await fixture.changeGridSize(testGridSize);

        const realizedGridSize = await fixture.getGridSize();
        expect(realizedGridSize).toBe(initialGridSize);
      });

      test("should not allow a grid size that is zero", async ({ fixture }) => {
        const initialGridSize = await fixture.getGridSize();
        const testGridSize = 0;

        await fixture.changeGridSize(testGridSize);

        const realizedGridSize = await fixture.getGridSize();
        expect(realizedGridSize).toBe(initialGridSize);
      });

      test("should not allow a grid size of negative infinity", async ({ fixture }) => {
        const initialGridSize = await fixture.getGridSize();
        const testGridSize = -Infinity;

        await fixture.changeGridSize(testGridSize);

        const realizedGridSize = await fixture.getGridSize();
        expect(realizedGridSize).toBe(initialGridSize);
      });

      test("should not allow a grid size of Infinity", async ({ fixture }) => {
        const initialGridSize = await fixture.getGridSize();
        const testGridSize = Infinity;

        await fixture.changeGridSize(testGridSize);

        const realizedGridSize = await fixture.getGridSize();
        expect(realizedGridSize).toBe(initialGridSize);
      });

      test.skip("should not use a grid size that is larger than the screen size", async ({ fixture }) => {
        const requestedGridSize = 100;
        const expectedGridSize = 8;

        await fixture.changeToDesktop();
        await fixture.changeGridSize(requestedGridSize);

        const gridSize = await fixture.getGridSize();
        expect(gridSize).toEqual(expectedGridSize);
      });

      test.skip("should scale up grid tiles if the grid size doesn't fill up the screen", async ({ fixture }) => {
        await fixture.changeGridSize(1);
        const expectedTileSize: Size = { width: 0, height: 0 };

        const realizedBox = await fixture.gridTileComponents().first().boundingBox();
        if (!realizedBox) {
          throw new Error("could not get bounding box");
        }

        const realizedSize: Size = {
          width: realizedBox.width,
          height: realizedBox.height,
        };

        expect(realizedSize).toEqual(expectedTileSize);
      });

      test.skip("should not scale up grid tiles if the grid size fills up the screen", async ({ fixture }) => {
        await fixture.changeGridSize(8);
        const expectedTileSize: Size = { width: 0, height: 0 };

        const realizedBox = await fixture.gridTileComponents().first().boundingBox();
        if (!realizedBox) {
          throw new Error("could not get bounding box");
        }

        const realizedSize: Size = {
          width: realizedBox.width,
          height: realizedBox.height,
        };

        expect(realizedSize).toEqual(expectedTileSize);
      });

      test.skip("should decrease the number of grid tiles if the grid size doesn't fit on the screen", () => {});

      test.skip("Should have a 1x1 grid size for mobile devices", async ({ fixture }) => {
        await fixture.changeToMobile();
        const expectedGridSize = 1;
        const realizedGridSize = await fixture.getGridSize();
        expect(realizedGridSize).toEqual(expectedGridSize);
      });
    });

    test.describe("changing the grid source", () => {
      test("should reset all decision when changing the grid source", async ({ fixture }) => {
        const expectedDecisionLength = await fixture.getGridSize();
        await fixture.makeVerificationDecision("true");
        expect(await fixture.gridDecisions()).toHaveLength(expectedDecisionLength);

        await fixture.changeGridSource(fixture.secondJsonInput);
        expect(await fixture.gridDecisions()).toHaveLength(0);
      });

      test("should remove all sub-selections when changing the grid source", async ({ fixture }) => {
        const subSelection = [0, 1];
        await fixture.createSubSelection(subSelection, ["ControlOrMeta"]);
        expect(await fixture.selectedTiles()).toHaveLength(subSelection.length);

        await fixture.changeGridSource(fixture.secondJsonInput);
        expect(await fixture.selectedTiles()).toHaveLength(0);
      });

      test("should stop viewing history", async ({ fixture }) => {
        await fixture.makeVerificationDecision("true");
        await fixture.viewPreviousHistoryPage();
        const initialHistoryState = await fixture.isViewingHistory();
        expect(initialHistoryState).toBe(true);

        await fixture.changeGridSource(fixture.secondJsonInput);
        const newHistoryState = await fixture.isViewingHistory();
        expect(newHistoryState).toBe(false);
      });
    });
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
      await fixture.createSubSelection(0);
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

  test.describe("changing settings", () => {
    test("disabling the axes in the settings should hide the axes", async ({ fixture }) => {
      await expect(fixture.areAxesVisible()).resolves.toBe(true);
      await fixture.showAxes(false);
      await expect(fixture.areAxesVisible()).resolves.toBe(false);
    });

    test("disabling the media controls in the settings should hide the media controls", async ({ fixture }) => {
      const initialState = await fixture.areMediaControlsVisible();
      expect(initialState).toBe(true);

      await fixture.showMediaControls(false);

      const realizedState = await fixture.areMediaControlsVisible();
      expect(realizedState).toBe(false);
    });
  });

  test.describe("data sources", () => {
    // TODO: this test is broken/disabled because spectrograms can cover the
    // file input button, causing visibility checks to fail
    // I can only reproduce this in Playwright, not in the browser
    // fix as part of https://github.com/ecoacoustics/web-components/issues/86
    test.fixme("should show a local data source in the correct location", async ({ fixture }) => {
      await fixture.changeSourceLocal(true);
      await expect(fixture.fileInputButton()).toBeVisible();
    });

    test("should not show a remote data source", async ({ fixture }) => {
      await fixture.changeSourceLocal(false);
      await expect(fixture.fileInputButton()).toBeHidden();
    });
  });

  test.describe("pagination", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.changeGridSize(3);
    });

    test("should disable the previous button when there are no previous pages", async ({ fixture }) => {
      await expect(fixture.previousPageButton()).toBeDisabled();
    });

    test("should disable the previous page button when at the start of history", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await expect(fixture.previousPageButton()).toBeEnabled();

      await fixture.viewPreviousHistoryPage();
      await expect(fixture.previousPageButton()).toBeDisabled();
    });

    test("should show the next page button when viewing history", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.makeVerificationDecision("false");
      await fixture.viewPreviousHistoryPage();
      await expect(fixture.nextPageButton()).toBeVisible();
    });

    test("should disable the next button when there are no next pages", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();
      await expect(fixture.nextPageButton()).toBeVisible();
    });

    test("should hide the 'Continue Verifying' button when not viewing history", async ({ fixture }) => {
      await expect(fixture.continueVerifyingButton()).toBeHidden();
    });

    test("should show the 'Continue Verifying' button when viewing history", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();
      await expect(fixture.continueVerifyingButton()).toBeVisible();
      await expect(fixture.continueVerifyingButton()).toBeEnabled();
    });

    test("should start viewing history when the previous page button is clicked", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();
      const isViewingHistory = await fixture.isViewingHistory();

      expect(isViewingHistory).toBe(true);
    });

    test("should stop viewing history when the 'Continue Verifying' button is clicked", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");

      await fixture.viewPreviousHistoryPage();
      const initialViewingHistory = await fixture.isViewingHistory();
      expect(initialViewingHistory).toBe(true);

      await fixture.continueVerifying();
      const newViewingHistory = await fixture.isViewingHistory();
      expect(newViewingHistory).toBe(false);
    });

    test("should stop playing audio and reset time when the grid auto pages", async ({ fixture }) => {
      await fixture.playSpectrogram(0);
      await fixture.makeVerificationDecision("true");

      // because there is a small delay between a an auto-page being requested
      // and the page actually changing, we need to wait for a short period of
      // time before we can assert the state of the audio
      // the short delay is an intentional feature that allows the user to see
      // that the decision has been applied to the grid before the grid auto pages
      await sleep(1);
      const postPagedPlayingState = await fixture.isAudioPlaying(0);
      const playbackTime = await fixture.audioPlaybackTime(0);

      expect(postPagedPlayingState).toBe(false);
      expect(playbackTime).toBe(0);
    });

    test.describe("shortcut keys", () => {});

    test.describe("auto paging", () => {});
  });

  test.describe("playing and pausing tiles", () => {
    test.describe("no sub-selection", () => {
      test("should play all tiles when the play shortcut is pressed", async ({ fixture }) => {
        const expectedPlayingCount = await fixture.getPopulatedGridSize();

        await fixture.shortcutGridPlay();
        const realizedPlayingStates = await fixture.playingSpectrograms();

        expect(realizedPlayingStates).toHaveLength(expectedPlayingCount);
      });

      test("should play a single tile in a 1x1 grid with keyboard shortcuts", async ({ fixture }) => {
        const expectedPlayingCount = 1;
        await fixture.changeGridSize(1);

        await fixture.shortcutGridPlay();

        const realizedPlayingStates = await fixture.playingSpectrograms();
        expect(realizedPlayingStates).toHaveLength(expectedPlayingCount);
      });

      test("should pause all tiles when the pause shortcut is pressed", () => {});
    });

    test.describe("with sub-selection", () => {
      const testedSubSelection = [0, 1];
      test.beforeEach(async ({ fixture }) => {
        await fixture.createSubSelection(testedSubSelection, ["ControlOrMeta"]);
      });

      test("should only play selected tiles when the play shortcut is pressed", async ({ fixture }) => {
        await fixture.shortcutGridPlay();
        const realizedPlayingStates = await fixture.playingSpectrograms();
        expect(realizedPlayingStates).toHaveLength(testedSubSelection.length);
      });

      // in this test, we assert that if two tiles are playing and the user
      // de-selects one of the tiles, only the selected tile should stop
      // when the user presses the pause shortcut
      test("should only pause selected tiles when the pause shortcut is pressed", async ({ fixture }) => {
        await fixture.shortcutGridPlay();

        await fixture.createSubSelection(1);
        await fixture.shortcutGridPause();

        const realizedPlayingStates = await fixture.playingSpectrograms();
        expect(realizedPlayingStates).toHaveLength(1);
      });
    });
  });

  test.describe("sub-selection", () => {
    const commonSelectionTests = () => {
      test("should select a tile when clicked", async ({ fixture }) => {
        const testSubSelection = 0;
        await fixture.createSubSelection(testSubSelection);

        const selectedTiles = await fixture.selectedTileIndexes();
        expect(selectedTiles).toEqual([testSubSelection]);

        expect(await fixture.focusedIndex()).toEqual(0);
      });

      test("should add a tile to a selection when the ctrl key is held", async ({ fixture }) => {
        const firstSubSelection = [0];
        const secondSubSelection = [1, 2];
        await fixture.createSubSelection(firstSubSelection);
        await fixture.createSubSelection(secondSubSelection, ["ControlOrMeta"]);

        const expectedSelectedTiles = firstSubSelection.concat(secondSubSelection);
        const selectedTiles = await fixture.selectedTileIndexes();
        expect(selectedTiles).toEqual(expectedSelectedTiles);

        expect(await fixture.focusedIndex()).toEqual(2);
      });

      test("should select a positive range of tiles when the shift key is held", async ({ fixture }) => {
        const selectionStart = 0;
        const selectionEnd = 2;

        await fixture.subSelectRange(selectionStart, selectionEnd);

        const expectedSelectedTiles = [0, 1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);

        expect(await fixture.focusedIndex()).toEqual(2);
      });

      test("should select a negative range of tiles when the shift key is held", async ({ fixture }) => {
        const selectionStart = 2;
        const selectionEnd = 0;

        await fixture.subSelectRange(selectionStart, selectionEnd);

        const expectedSelectedTiles = [0, 1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);

        expect(await fixture.focusedIndex()).toEqual(0);
      });

      test("should add a range of tiles to a selection if ctrl + shift is held", async ({ fixture }) => {
        const selectionStart = 0;
        const selectionEnd = 2;

        await fixture.subSelectRange(selectionStart, selectionEnd, ["ControlOrMeta"]);

        const expectedSelectedTiles = [0, 1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);

        expect(await fixture.focusedIndex()).toEqual(2);
      });

      test("should select a tile using alt + number selection shortcuts", async ({ fixture }) => {
        // the first tile in the grid should always have Alt + 1 as its
        // selection keyboard shortcut
        await fixture.page.keyboard.press("Alt+1");

        const expectedSelectedTile = 0;
        const realizedSelectedTiles = await fixture.selectedTileIndexes();

        expect(realizedSelectedTiles).toEqual([expectedSelectedTile]);
        expect(await fixture.focusedIndex()).toEqual(expectedSelectedTile);
      });

      test("should select a tile using ctrl & alt + number selection shortcuts", async ({ fixture }) => {
        await fixture.page.keyboard.press("ControlOrMeta+Alt+1");

        const expectedSelectedTile = 0;
        const realizedSelectedTiles = await fixture.selectedTileIndexes();

        expect(realizedSelectedTiles).toEqual([expectedSelectedTile]);
        expect(await fixture.focusedIndex()).toEqual(expectedSelectedTile);
      });

      test("should be able to add a range using the alt key selection shortcuts", async ({ fixture }) => {
        await fixture.page.keyboard.press("Shift+Alt+1");
        await fixture.page.keyboard.press("Shift+Alt+3");

        const expectedSelectedTiles = [0, 1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();

        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
        expect(await fixture.focusedIndex()).toEqual(2);
      });

      test("should add positive a range of tiles to a selection if ctrl + shift is held", async ({ fixture }) => {
        const selectionStart = 2;
        const selectionEnd = 0;

        await fixture.subSelectRange(selectionStart, selectionEnd, ["ControlOrMeta"]);

        const expectedSelectedTiles = [0, 1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);

        expect(await fixture.focusedIndex()).toEqual(0);
      });

      test("should have no operation if the same tile if shift clicked twice", async ({ fixture }) => {
        const subSelection = [1];

        await fixture.createSubSelection(subSelection, ["Shift"]);
        await fixture.createSubSelection(subSelection, ["Shift"]);

        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(subSelection);

        expect(await fixture.focusedIndex()).toEqual(1);
      });

      // if this test is failing, it might be because the selection box is
      // triggering when dragging the brightness range input
      test("should not select when using the media controls brightness range input", async ({ fixture }) => {
        const targetTile = 2;
        await fixture.changeBrightness(targetTile, 0.5);

        const selectedTiles = await fixture.selectedTiles();
        expect(selectedTiles).toHaveLength(0);
      });

      test.describe("highlight box selection", () => {
        // TODO: Selection highlight tests are flaky because the tests arn't
        // correctly waiting until the selection highlight RAF completes when
        // it makes its assertions.
        //
        // I have manually checked that this only occurs during testing, and
        // selection highlight works as expected for MacOS users.
        //
        // see: https://github.com/ecoacoustics/web-components/issues/429
        test.skip(!!process.env.CI && process.platform === "darwin");

        // there is a human tendency to move the mouse by a very small amount when
        // clicking the primary mouse button
        // to prevent this, there should be a minimum move amount until we start
        // creating a selection box
        // we start the selection slightly outside the tile so that the grid tile
        // does not register the client event
        test("should not create a selection box if the user drags a small px amount", async ({ fixture }) => {
          const dragAmount: Pixel = 10;

          const targetTile = fixture.gridTileComponents().first();
          const targetLocation = await targetTile.boundingBox();
          if (!targetLocation) {
            throw new Error("Could not get the bounding box of the target tile");
          }

          const selectionBoxSize = { width: dragAmount, height: dragAmount };
          const start: MousePosition = { x: targetLocation.x - dragAmount / 2, y: targetLocation.y - dragAmount / 2 };
          const end: MousePosition = {
            x: targetLocation.x + selectionBoxSize.width,
            y: targetLocation.y + selectionBoxSize.height,
          };

          await fixture.createSelectionBox(start, end);

          const realizedSelectedTiles = await fixture.selectedTiles();
          expect(realizedSelectedTiles).toHaveLength(0);
        });

        test("should be able to select a tile", async ({ fixture }) => {
          const testedTile = 0;

          await fixture.highlightSelectTiles(testedTile);

          const realizedSelectedTiles = await fixture.selectedTileIndexes();
          expect(realizedSelectedTiles).toEqual([testedTile]);
        });

        test("should be able to select multiple tiles in the positive direction", async ({ fixture }) => {
          await fixture.highlightSelectTiles(0, 1);

          const expectedSelectedTiles = [0, 1];
          const realizedSelectedTiles = await fixture.selectedTileIndexes();
          expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);

          // Because we selected in a positive direction, we expect the last
          // selected index to be focused.
          expect(await fixture.focusedIndex()).toEqual(1);
        });

        // TODO: The highlightSelectTiles fixture method doesn't currently
        // support negative highlight selection.
        test.fixme("should be able to select multiple tiles in the negative direction", async ({ fixture }) => {
          await fixture.highlightSelectTiles(1, 0);

          const expectedSelectedTiles = [0, 1];
          const realizedSelectedTiles = await fixture.selectedTileIndexes();
          expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);

          // Because we selected in a positive direction, we expect the first
          // selected index to be focused.
          expect(await fixture.focusedIndex()).toEqual(0);
        });

        test("should not be able to sub-select for a grid size of one", async ({ fixture }) => {
          await fixture.changeGridSize(1);
          await fixture.highlightSelectAllTiles();

          const selectedTiles = await fixture.selectedTiles();
          expect(selectedTiles).toHaveLength(0);
        });

        test("should be able to select new tiles if the grid size increases", async ({ fixture }) => {
          const currentGridSize = await fixture.getGridSize();
          await fixture.changeGridSize(currentGridSize + 1);

          await fixture.highlightSelectAllTiles();

          const expectedNumberOfSelected = await fixture.getGridSize();
          const realizedSelectedTiles = await fixture.selectedTiles();
          expect(realizedSelectedTiles).toHaveLength(expectedNumberOfSelected);
        });

        // if old tiles that no longer exist are still being selected this test will fail
        test("should select the correct number of tiles if the grid size decreases", async ({ fixture }) => {
          const currentGridSize = await fixture.getGridSize();
          const newGridSize = Math.min(1, currentGridSize);
          await fixture.changeGridSize(newGridSize);

          await fixture.highlightSelectAllTiles();

          // if the user should not be able to sub-select (a grid size of one)
          // then we should not see that any tiles are selected
          const canSubSelect = newGridSize > 1;
          const expectedNumberOfSelected = canSubSelect ? newGridSize : 0;
          const realizedSelectedTiles = await fixture.selectedTiles();

          expect(realizedSelectedTiles).toHaveLength(expectedNumberOfSelected);
        });

        test("should select tiles correctly after scrolling", async ({ fixture }) => {
          await fixture.page.mouse.wheel(0, 300);

          // We select the 6th tile because it is on the second row.
          // Meaning that the entire tile wll be in view after scrolling.
          const testedTile = 6;
          await fixture.highlightSelectTiles(testedTile);

          const realizedSelectedTiles = await fixture.selectedTileIndexes();
          expect(realizedSelectedTiles).toEqual([testedTile]);
        });

        test("should remove the current sub-selection if the ctrl key is not held", async ({ fixture }) => {
          await fixture.createSubSelection(0);

          await fixture.highlightSelectTiles(2, 3);

          const selectedTiles = await fixture.selectedTileIndexes();
          expect(selectedTiles).toEqual([2, 3]);
        });

        test("should add to the current selection if ctrl key is held", async ({ fixture }) => {
          await fixture.createSubSelection(0);

          await fixture.highlightSelectTiles(2, 3, ["ControlOrMeta"]);

          // Note that the tile at index 1 is missing from the expected result
          // because I want to assert that it is not just doing a range
          // selection.
          const selectedTiles = await fixture.selectedTileIndexes();
          expect(selectedTiles).toEqual([0, 2, 3]);
        });
      });
    };

    const desktopSelectionTests = () => {
      test.beforeEach(async ({ fixture }) => {
        await fixture.changeSelectionMode("desktop");
      });

      commonSelectionTests();

      test("should de-select other tiles when a tile is selected", async ({ fixture }) => {
        const firstSelection = [0];
        const secondSelection = [2];

        await fixture.createSubSelection(firstSelection);
        await fixture.createSubSelection(secondSelection);

        const realizedSelectedTiles = await fixture.selectedTileIndexes();

        // because we are in desktop selection mode, only the second selection
        // should be active because the first selection should have been
        // de-selected
        expect(realizedSelectedTiles).toHaveLength(1);
        expect(realizedSelectedTiles).toEqual(secondSelection);
      });

      test("should deselect other tiles the shift key is held", async ({ fixture }) => {
        await fixture.createSubSelection(0);

        const rangeStart = 1;
        const rangeEnd = 2;
        await fixture.subSelectRange(rangeStart, rangeEnd);

        const expectedSelectedTiles = [1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });

      // These keyboard selection tests are only run for
      test.describe("keyboard selection", () => {
        test("should select the first tile if RIGHT is pressed with nothing selected", async ({ fixture }) => {
          await fixture.page.keyboard.press(RIGHT_ARROW_KEY);
          expect(await fixture.selectedTileIndexes()).toEqual([0]);
          expect(await fixture.focusedIndex()).toEqual(0);
        });

        test("should select the first tile if DOWN is pressed with nothing selected", async ({ fixture }) => {
          await fixture.page.keyboard.press(DOWN_ARROW_KEY);
          expect(await fixture.selectedTileIndexes()).toEqual([0]);
          expect(await fixture.focusedIndex()).toEqual(0);
        });

        test("should select the first tile if HOME is pressed with nothing selected", async ({ fixture }) => {
          await fixture.page.keyboard.press(HOME_KEY);
          expect(await fixture.selectedTileIndexes()).toEqual([0]);
          expect(await fixture.focusedIndex()).toEqual(0);
        });

        test("should select the last tile if LEFT is pressed with nothing selected", async ({ fixture }) => {
          await fixture.page.keyboard.press(LEFT_ARROW_KEY);

          // I purposely get the last tile index after the down arrow so (if for
          // some reason), pressing down creates a new tile, this test will
          // correctly fail.
          const lastTileIndex = (await fixture.getGridSize()) - 1;
          expect(await fixture.selectedTileIndexes()).toEqual([lastTileIndex]);
          expect(await fixture.focusedIndex()).toEqual(lastTileIndex);
        });

        test("should select the last tile if the UP is pressed with nothing selected", async ({ fixture }) => {
          await fixture.page.keyboard.press(UP_ARROW_KEY);

          const lastTileIndex = (await fixture.getGridSize()) - 1;
          expect(await fixture.selectedTileIndexes()).toEqual([lastTileIndex]);
          expect(await fixture.focusedIndex()).toEqual(lastTileIndex);
        });

        test("should select the last tile if END is pressed with nothing selected", async ({ fixture }) => {
          await fixture.page.keyboard.press(END_KEY);

          const lastTileIndex = (await fixture.getGridSize()) - 1;
          expect(await fixture.selectedTileIndexes()).toEqual([lastTileIndex]);
          expect(await fixture.focusedIndex()).toEqual(lastTileIndex);
        });

        test("should be able to select to the start/end of the grid using shift + HOME/END", async ({ fixture }) => {
          await fixture.changeGridSize(6);

          // We select the tile at index 1, so that the first tile is selected.
          // We do this so that the there will always only be 1 tile selected,
          // or one tile missing from the selection.
          await fixture.createSubSelection(1);

          await pressKey(fixture.page, HOME_KEY, ["Shift"]);
          expect(await fixture.focusedIndex()).toEqual(0);
          expect(await fixture.selectedTileIndexes()).toEqual([0, 1]);

          // When performing a range selection with the END + shift keys, we
          // expect that the range selection will start from the originally
          // selected tile. Not the final tile of the HOME range selection.
          await pressKey(fixture.page, END_KEY, ["Shift"]);
          expect(await fixture.focusedIndex()).toEqual(5);
          expect(await fixture.selectedTileIndexes()).toEqual([1, 2, 3, 4, 5]);
        });

        test("should be able to move the selection with keyboard shortcuts", async ({ fixture }) => {
          // I purposely select the third tile so that this test will fail if
          // we incorrectly start moving from 0,0 instead of the selection head.
          // Also I use the third tile to prevent off by 1 errors
          // (e.g. incorrectly starting from 1,0/1,1/0,1)
          await fixture.createSubSelection(2);

          await fixture.page.keyboard.press(RIGHT_ARROW_KEY);
          expect(await fixture.selectedTileIndexes()).toEqual([3]);
          expect(await fixture.focusedIndex()).toEqual(3);

          const columnCount = await getBrowserValue<VerificationGridComponent, number>(
            fixture.gridComponent(),
            "columns",
          );
          const downIndex = 3 + columnCount;

          await fixture.page.keyboard.press(DOWN_ARROW_KEY);
          expect(await fixture.selectedTileIndexes()).toEqual([downIndex]);
          expect(await fixture.focusedIndex()).toEqual(downIndex);

          // Pressing the "down arrow key" while on the last row should not
          // have any action.
          await fixture.page.keyboard.press(DOWN_ARROW_KEY);
          expect(await fixture.selectedTileIndexes()).toEqual([downIndex]);
          expect(await fixture.focusedIndex()).toEqual(downIndex);
        });

        test("should be able to move the focus head with ctrl + arrow keys", async ({ fixture }) => {
          await fixture.createSubSelection(2);

          // Because we are currently on the first row, clicking the up arrow
          // key should have no operation.
          await pressKey(fixture.page, UP_ARROW_KEY, ["ControlOrMeta"]);
          expect(await fixture.focusedIndex()).toEqual(2);
          expect(await fixture.selectedTileIndexes()).toEqual([2]);

          // Even though we press the left arrow, because the ctrl key is being
          // held, only the focus head should move, meaning that the selection
          // head should not move either.
          await pressKey(fixture.page, LEFT_ARROW_KEY, ["ControlOrMeta"]);
          expect(await fixture.focusedIndex()).toEqual(1);
          expect(await fixture.selectedTileIndexes()).toEqual([2]);

          const columnCount = await getBrowserValue<VerificationGridComponent, number>(
            fixture.gridComponent(),
            "columns",
          );

          await pressKey(fixture.page, DOWN_ARROW_KEY, ["ControlOrMeta"]);
          expect(await fixture.focusedIndex()).toEqual(1 + columnCount);
          expect(await fixture.selectedTileIndexes()).toEqual([2]);

          // Because we are testing on a 2 row grid, pressing the down arrow
          // again should have no operation on the focus head.
          await pressKey(fixture.page, DOWN_ARROW_KEY, ["ControlOrMeta"]);
          expect(await fixture.focusedIndex()).toEqual(1 + columnCount);
          expect(await fixture.selectedTileIndexes()).toEqual([2]);
        });

        // If the focus head becomes unaligned with the selection head, the next
        // selection movement should move from the focus head position.
        // This mimics the behavior of the Window's file explorer where
        // selection will always start from the focus head.
        test("should resume selection from the focus head", async ({ fixture }) => {
          await fixture.createSubSelection(2);

          // We have already asserted in a previous test that this correctly
          // moves the focus head without moving the selection head.
          await pressKey(fixture.page, RIGHT_ARROW_KEY, ["ControlOrMeta"]);
          expect(await fixture.focusedIndex()).toEqual(3);
          expect(await fixture.selectedTileIndexes()).toEqual([2]);

          await pressKey(fixture.page, RIGHT_ARROW_KEY);
          expect(await fixture.focusedIndex()).toEqual(4);
          expect(await fixture.selectedTileIndexes()).toEqual([4]);
        });

        test("should be able to range select with the arrow keys", async ({ fixture }) => {
          await fixture.createSubSelection(2);

          // | | |x|
          // |x| | |
          await pressKey(fixture.page, RIGHT_ARROW_KEY, ["Shift"]);
          expect(await fixture.focusedIndex()).toEqual(3);
          expect(await fixture.selectedTileIndexes()).toEqual([2, 3]);

          // | | |x|
          // |x|x| |
          await pressKey(fixture.page, RIGHT_ARROW_KEY, ["Shift"]);
          expect(await fixture.focusedIndex()).toEqual(4);
          expect(await fixture.selectedTileIndexes()).toEqual([2, 3, 4]);

          // By going back over what I previously selected, I should see that
          // the tiles should be de-selected.

          // | | |x|
          // |x| | |
          await pressKey(fixture.page, LEFT_ARROW_KEY, ["Shift"]);
          expect(await fixture.focusedIndex()).toEqual(3);
          expect(await fixture.selectedTileIndexes()).toEqual([2, 3]);

          // I do the same action again to ensure that if there is an off-by-one
          // bug, this test will fail here.
          // | | |x|
          // | | | |
          await pressKey(fixture.page, LEFT_ARROW_KEY, ["Shift"]);
          expect(await fixture.focusedIndex()).toEqual(2);
          expect(await fixture.selectedTileIndexes()).toEqual([2]);

          // | |x|x|
          // | | | |
          await pressKey(fixture.page, LEFT_ARROW_KEY, ["Shift"]);
          expect(await fixture.focusedIndex()).toEqual(1);
          expect(await fixture.selectedTileIndexes()).toEqual([1, 2]);

          // |x|x|x|
          // | | | |
          await pressKey(fixture.page, LEFT_ARROW_KEY, ["Shift"]);
          expect(await fixture.focusedIndex()).toEqual(0);
          expect(await fixture.selectedTileIndexes()).toEqual([0, 1, 2]);

          // If I press shift + down, it should make a range selection starting
          // from my original selection tile (tile two).
          //
          // | | |x|
          // |x|x|x|
          await pressKey(fixture.page, DOWN_ARROW_KEY, ["Shift"]);
          expect(await fixture.focusedIndex()).toEqual(5);
          expect(await fixture.selectedTileIndexes()).toEqual([2, 3, 4, 5]);
        });

        test("should keyboard select from the last selected tile after positive range select", async ({ fixture }) => {
          await fixture.createSubSelection(2);

          // We have made assertions above that this works correctly, therefore
          // I do not need to make another assertion here.
          // We should be on tile index three (3).
          await pressKey(fixture.page, RIGHT_ARROW_KEY, ["Shift"]);

          await pressKey(fixture.page, RIGHT_ARROW_KEY);
          expect(await fixture.focusedIndex()).toEqual(4);
          expect(await fixture.selectedTileIndexes()).toEqual([4]);
        });

        test("should keyboard select from the last selected tile after negative range select", async ({ fixture }) => {
          await fixture.createSubSelection(2);

          await pressKey(fixture.page, LEFT_ARROW_KEY, ["Shift"]);

          await pressKey(fixture.page, LEFT_ARROW_KEY);
          expect(await fixture.focusedIndex()).toEqual(0);
          expect(await fixture.selectedTileIndexes()).toEqual([0]);
        });
      });
    };

    const tabletSelectionTests = () => {
      test.beforeEach(async ({ fixture }) => {
        await fixture.changeSelectionMode("tablet");
      });

      commonSelectionTests();

      test("should toggle a tiles selection state if the same tile is clicked twice", async ({ fixture }) => {
        await fixture.createSubSelection(0);
        await fixture.createSubSelection(0);

        const realizedSelectedTiles = await fixture.selectedTiles();
        expect(realizedSelectedTiles).toHaveLength(0);
      });

      test("should not de-select other tiles when a tile is selected", async ({ fixture }) => {
        await fixture.createSubSelection(0);
        await fixture.createSubSelection(2);

        const expectedSelectedTiles = [0, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });

      test("should not de-select tiles when a range selection occurs", async ({ fixture }) => {
        await fixture.createSubSelection(0);

        const rangeStart = 1;
        const rangeEnd = 2;
        await fixture.subSelectRange(rangeStart, rangeEnd);

        const expectedSelectedTiles = [0, 1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });
    };

    test.describe("desktop selection mode", desktopSelectionTests);

    test.describe("tablet selection mode", tabletSelectionTests);

    // TODO: for some reason, the ctrl + A event is not triggering the
    // verification grids keyboard event handler
    // I have manually checked that this test passes in a real browser
    test.fixme("should select all tiles if ctrl + A is pressed", async ({ fixture }) => {
      await fixture.page.keyboard.press("ControlOrMeta+a");

      const expectedNumberOfSelected = await fixture.getGridSize();
      const realizedNumberOfSelected = await fixture.selectedTiles();

      expect(realizedNumberOfSelected).toHaveLength(expectedNumberOfSelected);
    });

    test("should deselect all tiles if ctrl + D is pressed", async ({ fixture }) => {
      await fixture.createSubSelection(0);
      const initialSelectedTiles = await fixture.selectedTiles();
      expect(initialSelectedTiles).toHaveLength(1);

      await fixture.page.keyboard.press("ControlOrMeta+d");

      const realizedNumberOfSelected = await fixture.selectedTiles();
      expect(realizedNumberOfSelected).toHaveLength(0);
    });

    test("should deselect all tiles if the escape key is pressed", async ({ fixture }) => {
      await fixture.createSubSelection(0);
      const initialSelectedTiles = await fixture.selectedTiles();
      expect(initialSelectedTiles).toHaveLength(1);

      await fixture.page.keyboard.press(ESCAPE_KEY);

      const realizedNumberOfSelected = await fixture.selectedTiles();
      expect(realizedNumberOfSelected).toHaveLength(0);
    });
  });

  test.describe("grid sizes", () => {
    test("should show new items when increasing the grid size", async ({ fixture }) => {
      await fixture.changeGridSize(3);

      const initialGridSize = await fixture.getGridSize();
      const newGridSize = initialGridSize + 1;

      const expectedNewModel: SubjectWrapper = new SubjectWrapper(
        {
          AudioLink: "http://localhost:3000/example.flac",
          Datetime: "2019-10-22T04:00:00.000Z",
          Distance: "4.958763122558594",
          FileId: 251486,
          Filename: "20191022T140000+1000_SEQP-Samford-Dry-B_251486.flac",
          Offset: 15,
          Site: "SEQP-Samford",
          SiteId: 255,
          Subsite: "Dry-B",
          Tag: "koala",
        },
        "http://localhost:3000/example.flac",
        { text: "koala" },
      );

      await fixture.changeGridSize(newGridSize);

      const newModels = await fixture.verificationGridTileModels();
      const newTileModel = newModels.at(-1);
      if (!newTileModel) {
        throw new Error("Could not get the last tile model");
      }

      // we cannot directly compare the two objects because Playwright
      // loses some information during browser > nodejs serialization
      // e.g. Map's are converted to objects
      // therefore, we assert that the new model was added, but do not assert
      // over conditions such as the "classifications" map
      expect(newTileModel.subject).toEqual(expectedNewModel.subject);
      expect(newTileModel.url).toEqual(expectedNewModel.url);
      expect(newTileModel.tag).toEqual(expectedNewModel.tag);
    });

    // grid indexes are used to create sub-selection shortcut keys. If this test
    // fails, it is likely that sub-selection keyboard shortcuts do not work
    test("should have the correct grid tile indexes after increasing grid size", async ({ fixture }) => {
      await fixture.changeGridSize(3);

      const initialGridSize = await fixture.getGridSize();
      const newGridSize = initialGridSize + 1;
      await fixture.changeGridSize(newGridSize);

      const gridTileOfInterest = fixture.gridTileComponents().last();

      // because the first index of the verification grid (size = 1) is index 0
      // we subtract one from the grid size to get the expected index of the
      // last grid tile
      const expectedNewIndex = newGridSize - 1;
      const realizedNewIndex = await getBrowserValue<VerificationGridTileComponent>(gridTileOfInterest, "index");
      expect(realizedNewIndex).toBe(expectedNewIndex);
    });

    test("should not page any items when increasing and decreasing the grid size", async ({ fixture }) => {
      const initialGridSize = await fixture.getGridSize();
      await fixture.changeGridSize(initialGridSize + 1);
      await fixture.changeGridSize(initialGridSize);

      const expectedPagedItems = 0;
      const realizedPagedItems = await fixture.getViewHead();

      expect(realizedPagedItems).toBe(expectedPagedItems);
    });

    test("should show un-decided items if increasing the grid size from the end of history", async ({ fixture }) => {
      // we change the initial grid size that we make decisions about to two
      // so that when we increase the grid size, we know that the new grid size
      // will fit and show the un-decided items
      const initialGridSize = 2;
      await fixture.changeGridSize(initialGridSize);

      // because we make a decision about the entire page, we expect that the
      // verification grid will auto-page, allowing us to navigate back in
      // history
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();

      const newGridSize = initialGridSize + 1;
      await fixture.changeGridSize(newGridSize);

      // we expect that the first two tiles will hold the same decision that we
      // made before we increased the grid size
      const firstTileDecisions = await fixture.getAppliedDecisions(0);
      const secondTileDecisions = await fixture.getAppliedDecisions(1);
      const undecidedTileDecisions = await fixture.getAppliedDecisions(2);

      expect(firstTileDecisions.length).toBeGreaterThan(0);
      expect(secondTileDecisions.length).toBeGreaterThan(0);
      expect(undecidedTileDecisions.length).toEqual(0);
    });

    test("should retain sub-selection after increasing grid size", async ({ fixture }) => {
      const initialGridSize = 2;
      await fixture.changeGridSize(initialGridSize);

      const testedSubSelection = [0, 1];
      await fixture.createSubSelection(testedSubSelection, ["ControlOrMeta"]);
      const initialSelectedTiles = await fixture.selectedTileIndexes();

      await fixture.changeGridSize(initialGridSize + 1);

      expect(initialSelectedTiles).toEqual(testedSubSelection);
    });

    test("should retain decisions after increasing grid size", async ({ fixture }) => {
      const initialGridSize = 2;
      await fixture.changeGridSize(initialGridSize);

      // we sub-select the first tile and make a decision about it so that the
      // verification grid will not auto-page, because the second tile doesn't
      // have a decision applied to it
      await fixture.createSubSelection(0);
      await fixture.makeVerificationDecision("true");

      const newGridSize = initialGridSize + 1;
      await fixture.changeGridSize(newGridSize);

      // after increasing the grid size, we expect that the first tile will
      // still have its decision applied to it
      const testedTileDecisions = await fixture.getAppliedDecisions(0);
      expect(testedTileDecisions.length).toBeGreaterThan(0);
    });

    // if we make a decision about a tile, then hide the tile by decreasing the
    // grid size until it is hidden, the tile should still have the decision
    // applied, and we should be able to see the decision again if we increase
    // the grid size until the tile is visible again
    test("should retain decisions hidden by a decreased grid size", async ({ fixture }) => {
      const initialGridSize = 2;
      await fixture.changeGridSize(initialGridSize);

      // we sub-select the last tile and make a decision about it so that when
      // we decrease the grid size, this last tile will be hidden first
      await fixture.createSubSelection(1);
      await fixture.makeVerificationDecision("true");

      const newGridSize = initialGridSize - 1;
      await fixture.changeGridSize(newGridSize);

      // after changing the grid size down by one, we expect that none of the
      // tiles will have any decisions applied to them because the only tile
      // with a decision applied was hidden when the grid size was decreased
      const undecidedTileDecisions = await fixture.getAppliedDecisions(0);
      expect(undecidedTileDecisions.length).toEqual(0);

      // we increase the grid size until the tile is visible again
      await fixture.changeGridSize(initialGridSize);

      // after increasing the grid size, we expect that the last tile will still
      // have its decision applied to it
      const testedTileDecisions = await fixture.getAppliedDecisions(1);
      expect(testedTileDecisions.length).toBeGreaterThan(0);
    });

    interface DynamicGridSizeTest {
      deviceName: string;
      device: DeviceMock;
      withoutSlotShape: GridShape;
      withSlotShape: GridShape;
    }

    const testedGridSizes = [
      {
        deviceName: "desktop",
        device: mockDeviceSize(testBreakpoints.desktop),
        withoutSlotShape: { columns: 5, rows: 2 },
        withSlotShape: { columns: 6, rows: 2 },
      },
      {
        deviceName: "laptop",
        device: mockDeviceSize(testBreakpoints.laptop),
        withoutSlotShape: { columns: 4, rows: 1 },
        withSlotShape: { columns: 4, rows: 1 },
      },
      {
        deviceName: "landscape tablet",
        device: mockDeviceSize(testBreakpoints.tabletLandscape),
        withoutSlotShape: { columns: 3, rows: 1 },
        withSlotShape: { columns: 3, rows: 1 },
      },
      {
        deviceName: "portrait tablet",
        device: mockDeviceSize(testBreakpoints.tabletPortrait),
        withoutSlotShape: { columns: 2, rows: 2 },
        withSlotShape: { columns: 2, rows: 1 },
      },
      {
        deviceName: "mobile",
        device: mockDeviceSize(testBreakpoints.mobile),
        withoutSlotShape: { columns: 1, rows: 1 },
        withSlotShape: { columns: 1, rows: 1 },
      },
    ] satisfies DynamicGridSizeTest[];

    for (const testConfig of testedGridSizes) {
      const testedSlotContent = `
        <template>
          <div>
            <h1>Heading text</h1>

            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil odio laboriosam ea culpa magnam aut iure,
              voluptate nisi. Enim natus blanditiis quam ipsa vero magni deserunt ratione qui explicabo. Est!
            </p>
          </div>
        </template>

        <oe-verification verified="true" shortcut="Y"></oe-verification>
        <oe-verification verified="false" shortcut="N"></oe-verification>
      `;

      // TODO: These tests broke when changing the chrome logic
      // however, I think that the test might now be out of date.
      // This is because the axes components chrome used to not contribute to
      // the grid tile size, but now it does. Meaning that these tests should
      // have changed a bit, but I have not validated if they are failing for a
      // valid reason.
      test.describe.fixme(testConfig.deviceName, () => {
        test(`should have the correct grid shape`, async ({ fixture }) => {
          await testConfig.device(fixture.page);
          await fixture.create();

          const realizedGridShape = await fixture.getGridShape();
          expect(realizedGridShape).toEqual(testConfig.withoutSlotShape);
        });

        // if these tests are failing it is a sign that the grid tile's
        // intersection observer is not working correctly
        test("should have the correct grid shape with slot content", async ({ fixture }) => {
          await testConfig.device(fixture.page);
          await fixture.create(testedSlotContent);

          const realizedGridShape = await fixture.getGridShape();
          expect(realizedGridShape).toEqual(testConfig.withSlotShape);
        });

        test("should look correct", async ({ fixture }) => {
          await testConfig.device(fixture.page);
          await fixture.create();

          await fixture.onlyShowTileOutlines();
          await expect(fixture.page).toHaveScreenshot();
        });

        test("should look correct with slot content", async ({ fixture }) => {
          await testConfig.device(fixture.page);
          await fixture.create(testedSlotContent);

          // to reduce the maintainability burden of this test, we only check
          // the grid container for visual correctness
          // we also make all of the elements invisible, and only show outlines
          // of each grid tile
          await fixture.onlyShowTileOutlines();
          await expect(fixture.page).toHaveScreenshot();
        });
      });
    }
  });

  // during progressive creation, individual elements will be added to the
  // document, meaning that the verification grid is in various invalid states
  test.describe("progressive creation of a verification grid", () => {});
});

test.describe("small datasets", () => {
  const datasetSize = 3;

  test.beforeEach(async ({ fixture }) => {
    await fixture.create(undefined, undefined, fixture.smallJsonInput);
  });

  test("should have a placeholder tile for small datasets", async ({ fixture }) => {
    const testedGridSize = 4;
    const expectedPlaceholderCount = testedGridSize - datasetSize;

    await fixture.changeGridSize(testedGridSize);

    await expect(fixture.gridTileContainers()).toHaveCount(datasetSize);
    await expect(fixture.gridTilePlaceholders()).toHaveCount(expectedPlaceholderCount);
  });

  test("should not have any placeholders if the grid size is large enough", async ({ fixture }) => {
    await fixture.changeGridSize(2);
    await expect(fixture.gridTilePlaceholders()).toHaveCount(0);
  });
});

test.describe("decisions", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.changeGridSize(3);
  });

  test("should be able to add a decisions to a sub-selection", async ({ fixture }) => {
    await fixture.createSubSelection(0);
    await fixture.makeVerificationDecision("true");

    const firstTileDecisions = await fixture.getAppliedDecisions(0);
    expect(firstTileDecisions).toEqual([
      {
        confirmed: DecisionOptions.TRUE,
        tag: { text: "koala" },
      },
    ]);

    await fixture.createSubSelection(1);
    await fixture.makeVerificationDecision("true");

    // we test selecting two tiles with different tags because this test
    // previously failed because the verification button would use an object
    // reference for the tag, causing the tag model from the second tile to
    // overwrite the tag model from the first tile
    // see https://github.com/ecoacoustics/web-components/issues/245
    const secondTileDecisions = await fixture.getAppliedDecisions(1);
    expect(secondTileDecisions).toEqual([
      {
        confirmed: DecisionOptions.TRUE,
        tag: { text: "fish" },
      },
    ]);

    // we should see that any tiles that we have not clicked on do not have a
    // decision applied to them
    const undecidedTileDecisions = await fixture.getAppliedDecisions(2);
    expect(undecidedTileDecisions).toEqual([]);
  });

  test("should be able to add a decision to all subjects", async ({ fixture }) => {
    // by making a decision without making a sub-selection first, we should
    // see that all the tiles get the decision applied to them
    await fixture.makeVerificationDecision("false");

    const appliedDecisions = await fixture.allAppliedDecisions();
    expect(appliedDecisions).toEqual([
      { confirmed: DecisionOptions.FALSE, tag: { text: "koala" } },
      { confirmed: DecisionOptions.FALSE, tag: { text: "fish" } },
      { confirmed: DecisionOptions.FALSE, tag: { text: "kangaroo" } },
    ]);
  });

  test("should be able to change a decision", async ({ fixture }) => {
    const testedTileIndex = 0;

    await fixture.createSubSelection(testedTileIndex);
    await fixture.makeVerificationDecision("true");

    const firstTileDecisions = await fixture.getAppliedDecisions(testedTileIndex);
    expect(firstTileDecisions).toEqual([
      {
        confirmed: DecisionOptions.TRUE,
        tag: { text: "koala" },
      },
    ]);

    // Because the decision head would have automatically advanced because there
    // was only one tile selected, we have to re-select the same tile to change
    // the decision.
    await fixture.createSubSelection(testedTileIndex);

    // notice that the "confirmed" value has change from "true" to "false"
    // because we changed the decision
    await fixture.makeVerificationDecision("false");
    const finalTileDecisions = await fixture.getAppliedDecisions(testedTileIndex);
    expect(finalTileDecisions).toEqual([
      {
        confirmed: DecisionOptions.FALSE,
        tag: { text: "koala" },
      },
    ]);
  });

  test("should emit the correct event", async ({ fixture }) => {
    const targetTile = 0;

    const decisionEvent = catchLocatorEvent<CustomEvent<SubjectWrapper[]>>(fixture.gridComponent(), "decision-made");
    await fixture.createSubSelection(0);
    await fixture.makeVerificationDecision("true");

    const targetGridTile = fixture.gridTileComponents().nth(targetTile);
    const expectedSubjectWrapper = (await getBrowserValue<VerificationGridTileComponent>(
      targetGridTile,
      "model",
    )) as SubjectWrapper;

    const realizedEvent = await decisionEvent;
    expect(realizedEvent).toEqual([expectedSubjectWrapper]);
  });

  test.describe("auto advancing head", () => {
    test("should advance the selection head if one item is selected", async ({ fixture }) => {
      await fixture.createSubSelection(0);
      await fixture.makeVerificationDecision("true");

      expect(await fixture.selectedTileIndexes()).toEqual([1]);
      expect(await fixture.focusedIndex()).toEqual(1);
    });

    test("should not advance the selection head if multiple items are selected", async ({ fixture }) => {
      // Note that I make the same verification decision in tests asserting the
      // automatically advancing head so that I can isolate any failures to the
      // selection, and not the decision.
      await fixture.createSubSelection([0, 1], ["ControlOrMeta"]);
      expect(await fixture.selectedTileIndexes()).toEqual([0, 1]);
      expect(await fixture.focusedIndex()).toEqual(1);

      await fixture.makeVerificationDecision("true");

      expect(await fixture.selectedTileIndexes()).toEqual([0, 1]);
      expect(await fixture.focusedIndex()).toEqual(1);
    });

    test("should skip tiles with decisions", async ({ fixture }) => {
      await fixture.createSubSelection(1);
      await fixture.makeVerificationDecision("true");

      await fixture.createSubSelection(0);
      await fixture.makeVerificationDecision("true");

      // We should see that the tile at index 1 was skipped because it already
      // has a decision applied, and the auto-advancement should place the
      // selection and focus head on the third tile.
      expect(await fixture.selectedTileIndexes()).toEqual([2]);
      expect(await fixture.focusedIndex()).toEqual(2);
    });

    test("should advance to the first undecided tile if advancing past the end", async ({ fixture }) => {
      await fixture.createSubSelection(0);
      await fixture.makeVerificationDecision("true");

      const lastTileIndex = (await fixture.getGridSize()) - 1;
      await fixture.createSubSelection(lastTileIndex);
      await fixture.makeVerificationDecision("false");

      expect(await fixture.selectedTileIndexes()).toEqual([1]);
      expect(await fixture.focusedIndex()).toEqual(1);
    });
  });
});

test.describe("decision meter", () => {
  test.describe("classification task", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithClassificationTask();
      await fixture.changeGridSize(3);
    });

    test("should have the correct number of segments in the progress meter", async ({ fixture }) => {
      await expect(fixture.gridTileProgressMeterSegments()).toHaveCount(3);
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
      await fixture.makeSkipDecision();

      // when the skip button is clicked, the next page rendered
      // therefore, if we want to see that the correct colors were applied, we
      // have to navigate back in history
      await fixture.viewPreviousHistoryPage();

      const expectedColors = [
        await fixture.getClassificationColor("car", true),
        await fixture.panelColor(),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is skipped", async ({ fixture }) => {
      await fixture.makeClassificationDecision("car", true);
      await fixture.makeSkipDecision();

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
      await expect(fixture.gridTileProgressMeterSegments()).toHaveCount(1);
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
      await expect(fixture.gridTileProgressMeterSegments()).toHaveCount(4);
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
});

test.describe("verification grid with custom template", () => {
  test.describe.skip("information cards", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create(
        `
        <oe-verification verified="true">Koala</oe-verification>
        <oe-verification verified="false">Not Koala</oe-verification>

        <template>
          <oe-info-card></oe-info-card>
        </template>
      `,
        ["oe-info-card"],
      );
    });

    test("should show the information about the current tile", async ({ fixture }) => {
      const expectedInfoCard = [
        { key: "Filename", value: "20220130T160000+1000_SEQP-Samford-Dry-B_643356.flac" },
        { key: "FileId", value: "643,356" },
        { key: "Datetime", value: "2022-01-30T06:00:00.000Z" },
      ] as const;

      const realizedInfoCard = await fixture.infoCardItem(0);
      expect(realizedInfoCard).toEqual(expectedInfoCard);
    });

    test("should update correctly when paging", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");

      // because it can take a while for the next page to load, and the info
      // cards to update, we have to wait until we receive the "grid-loaded"
      // event that signals that the next page has been loaded
      await catchLocatorEvent(fixture.gridComponent(), "grid-loaded");

      const expectedInfoCard = [
        { key: "Title 1", value: "Description 1" },
        { key: "Title 2", value: "Description 2" },
      ];
      const realizedInfoCard = await fixture.infoCardItem(0);
      expect(realizedInfoCard).toEqual(expectedInfoCard);
    });

    test("should update correctly when viewing history", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();

      const expectedInfoCard = [
        { key: "Title 1", value: "Description 1" },
        { key: "Title 2", value: "Description 2" },
      ];
      const realizedInfoCard = await fixture.infoCardItem(0);
      expect(realizedInfoCard).toEqual(expectedInfoCard);
    });

    test("should update correctly when changing the grid source", async ({ fixture }) => {
      const expectedInitialInfoCard = [
        { key: "Title 1", value: "Description 1" },
        { key: "Title 2", value: "Description 2" },
      ];
      const expectedNewInfoCard = [
        { key: "Title 3", value: "Description 3" },
        { key: "Title 4", value: "Description 4" },
      ];

      await fixture.changeGridSource(fixture.testJsonInput);

      const realizedInitialInfoCard = await fixture.infoCardItem(0);
      expect(realizedInitialInfoCard).toEqual(expectedInitialInfoCard);

      await fixture.changeGridSource(fixture.secondJsonInput);
      const realizedNewInfoCard = await fixture.infoCardItem(0);
      expect(realizedNewInfoCard).toEqual(expectedNewInfoCard);
    });
  });
});

test.describe("verification grid interaction with the host application", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.createWithAppChrome();
  });

  test("should not select all tiles when ctrl + A is pressed inside the input box", async ({ fixture }) => {
    await fixture.hostAppInput().press("ControlOrMeta+a");
    const selectedTiles = await fixture.selectedTiles();
    expect(selectedTiles).toHaveLength(0);
  });

  test("should not make a decision when using a shortcut in the host applications input", async ({ fixture }) => {
    await logEvent(fixture.page, "decision");

    // try both lowercase and uppercase shortcuts
    await fixture.hostAppInput().press("Y");
    await fixture.hostAppInput().press("y");

    await sleep(1);

    const events: unknown[] = await getEventLogs(fixture.page, "decision");
    expect(events).toHaveLength(0);
  });

  test("should not play spectrograms when the spacebar is pressed in the host app input", async ({ fixture }) => {
    // to give the grid tiles the best chance at playing the audio
    // (if the logic is faulty), we make a sub-selection first
    await fixture.createSubSelection(0);
    await fixture.hostAppInput().press("Space");

    const isPlaying = await fixture.isAudioPlaying(0);
    expect(isPlaying).toEqual(false);
  });

  test("should allow ctrl + A once the verification grid regains focus", async ({ fixture }) => {
    await fixture.hostAppInput().press("ControlOrMeta+a");

    // select a tile to ensure that the grid has focus
    await fixture.createSubSelection(0);
    await fixture.page.keyboard.press("ControlOrMeta+a");

    const expectedSelectedTiles = await fixture.getGridSize();
    const selectedTiles = await fixture.selectedTiles();
    expect(selectedTiles).toHaveLength(expectedSelectedTiles);
  });

  test("should allow decision shortcuts once the verification grid regains focus", async ({ fixture }) => {
    await fixture.hostAppInput().press("y");

    await logEvent(fixture.page, "decision");

    // select a tile to ensure that the grid has focus
    await fixture.createSubSelection(0);
    await fixture.page.keyboard.press("y");

    const events: unknown[] = await getEventLogs(fixture.page, "decision");
    expect(events).toHaveLength(1);
  });

  test("should allow the spacebar to play audio once the verification grid regains focus", async ({ fixture }) => {
    await fixture.hostAppInput().press("Space");

    // select a tile to ensure that the grid has focus
    await fixture.createSubSelection(0);
    await fixture.page.keyboard.press("Space");

    const isPlaying = await fixture.isAudioPlaying(0);
    expect(isPlaying).toEqual(true);
  });
});
