import { Size } from "../../models/rendering";
import { GridShape } from "../../helpers/controllers/dynamic-grid-sizes";
import {
  catchLocatorEvent,
  changeToDesktop,
  changeToMobile,
  DeviceMock,
  getBrowserValue,
  getEventLogs,
  logEvent,
  mockDeviceSize,
  setBrowserAttribute,
  testBreakpoints,
} from "../helpers";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import {
  MousePosition,
  ProgressBar,
  SpectrogramCanvasScale,
  VerificationGridComponent,
  VerificationGridTileComponent,
} from "../../components";
import { AudioCachedState, SubjectWrapper } from "../../models/subject";
import { ESCAPE_KEY } from "../../helpers/keyboard";
import { Pixel } from "../../models/unitConverters";
import { DecisionOptions } from "../../models/decisions/decision";

test.describe("while the initial bootstrap dialog is open", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
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
  test.beforeEach(async ({ fixture, page }) => {
    await fixture.create();

    await page.setViewportSize({ width: 1920, height: 1080 });

    // because the user should not be able to start interacting with the
    // verification grid while the bootstrap dialog is open, we need to dismiss it
    // before we start asserting the functionality of the verification grid
    await fixture.dismissBootstrapDialog();
  });

  test.describe("initial state", () => {
    test("should have the correct decisions", async ({ fixture }) => {
      const expectedDecisions = ["true", "false"];
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

      const progressBar = fixture.gridProgressBar();
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

    test("should not have any applied decisions", () => {});
  });

  // unlike the initial bootstrap dialog, these tests assert that the bootstrap dialog
  // explicitly opened by the user (through the question mark button) behaves
  // correctly
  test.describe("bootstrap dialog", () => {
    const advancedShortcutSlideTitle = "Keyboard shortcuts";

    test("should open advanced shortcuts when the help button is clicked on desktop", async ({ fixture, page }) => {
      await changeToMobile(page);
      await fixture.openBootstrapDialog();

      const isBootstrapDialogOpen = await fixture.isBootstrapDialogOpen();
      expect(isBootstrapDialogOpen).toBe(true);

      const realizedSlideTitle = await fixture.bootstrapDialogSlideTitle();
      expect(realizedSlideTitle).not.toBe(advancedShortcutSlideTitle);
    });

    // If the user is on a mobile device, there is no purpose in opening the
    // advanced shortcuts bootstrap dialog because they cannot use the keyboard
    // therefore, if the user clicks on the help button while on a mobile, we
    // expect that the user is taken straight to the tutorial modal
    test("should open the tutorial bootstrap when the help button is clicked on mobile", async ({ fixture, page }) => {
      await changeToDesktop(page);
      await fixture.openBootstrapDialog();

      const isBootstrapDialogOpen = await fixture.isBootstrapDialogOpen();
      expect(isBootstrapDialogOpen).toBe(true);

      const realizedSlideTitle = await fixture.bootstrapDialogSlideTitle();
      expect(realizedSlideTitle).toBe(advancedShortcutSlideTitle);
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

      test.skip("should not use a grid size that is larger than the screen size", async ({ fixture, page }) => {
        const requestedGridSize = 100;
        const expectedGridSize = 8;

        await changeToDesktop(page);
        await fixture.changeGridSize(requestedGridSize);

        const gridSize = await fixture.getGridSize();
        expect(gridSize).toEqual(expectedGridSize);
      });

      test.skip("should scale up grid tiles if the grid size doesn't fill up the screen", async ({ fixture }) => {
        await fixture.changeGridSize(1);
        const expectedTileSize: Size = { width: 0, height: 0 };
        const realizedTileSize = (await fixture.tileSizes())[0];
        expect(realizedTileSize).toEqual(expectedTileSize);
      });

      test.skip("should not scale up grid tiles if the grid size fills up the screen", async ({ fixture }) => {
        await fixture.changeGridSize(8);

        const expectedTileSize: Size = { width: 0, height: 0 };
        const realizedTileSize = (await fixture.tileSizes())[0];

        expect(realizedTileSize).toEqual(expectedTileSize);
      });

      test.skip("should decrease the number of grid tiles if the grid size doesn't fit on the screen", () => {});

      test.skip("Should have a 1x1 grid size for mobile devices", async ({ fixture, page }) => {
        await changeToMobile(page);
        const expectedGridSize = 1;
        const realizedGridSize = await fixture.getGridSize();
        expect(realizedGridSize).toEqual(expectedGridSize);
      });
    });

    // these tests are broken because grid source has been moved to the
    // oe-data-source component
    // TODO: Move these test to the data-source component
    //
    // test.describe("changing the grid source", () => {
    //   test("should reset all decision when changing the grid source", async ({ fixture }) => {
    //     const expectedDecisionLength = await fixture.getGridSize();
    //     await fixture.makeDecision(0);
    //     const initialDecisions = await fixture.userDecisions();
    //     expect(initialDecisions).toHaveLength(expectedDecisionLength);

    //     await fixture.changeGridSource(fixture.secondJsonInput);
    //     const newDecisions = await fixture.userDecisions();
    //     expect(newDecisions).toHaveLength(0);
    //   });

    //   test("should remove all sub-selections when changing the grid source", async ({ fixture }) => {
    //     const subSelection = [0, 1];
    //     await fixture.createSubSelection(subSelection);
    //     const selectedTiles = await fixture.selectedTiles();
    //     expect(selectedTiles).toHaveLength(subSelection.length);

    //     await fixture.changeGridSource(fixture.secondJsonInput);
    //     const newSelectedTiles = await fixture.selectedTiles();
    //     expect(newSelectedTiles).toHaveLength(0);
    //   });

    //   test("should remove all decision button highlights when changing the grid source", async ({ fixture }) => {
    //     const decision = 0;
    //     await fixture.makeDecision(decision);
    //     await fixture.viewPreviousHistoryPage();
    //     const initialHighlightedDecisions = await fixture.highlightedButtons();
    //     expect(initialHighlightedDecisions).toStrictEqual([decision]);

    //     await fixture.changeGridSource(fixture.secondJsonInput);
    //     const newHighlightedDecisions = await fixture.highlightedButtons();
    //     expect(newHighlightedDecisions).toHaveLength(0);
    //   });

    //   test("should remove all tile highlights when changing the grid source", async ({ fixture }) => {
    //     const decision = 0;
    //     await fixture.makeDecision(decision);
    //     await fixture.viewPreviousHistoryPage();

    //     const initialTileHighlights = await fixture.highlightedTiles();
    //     const gridSize = await fixture.getGridSize();
    //     expect(initialTileHighlights).toHaveLength(gridSize);

    //     await fixture.changeGridSource(fixture.secondJsonInput);
    //     const newHighlightedDecisions = await fixture.buttonHighlightColors();
    //     expect(newHighlightedDecisions).toHaveLength(0);
    //   });

    //   test("should correctly reset all the information cards", async ({ fixture }) => {
    //     const testIndex = 0;
    //     const initialInfoContent = await fixture.infoCardItem(testIndex);

    //     await fixture.changeGridSource(fixture.secondJsonInput);
    //     const newInfoContent = await fixture.infoCardItem(testIndex);

    //     expect(newInfoContent).not.toEqual(initialInfoContent);
    //   });

    //   test("should correctly move all indicators to the start of the recordings", async ({ fixture, page }) => {
    //     const targetedTile = 0;

    //     // TODO: we should use the new Playwright clock API when
    //     // web-ctx-playwright gets upgraded to version 1.45.0
    //     // https://playwright.dev/docs/api/class-clock
    //     await fixture.playSpectrogram(targetedTile);
    //     await page.waitForTimeout(1000);
    //     const indicatorPosition = await fixture.indicatorPosition(targetedTile);
    //     expect(indicatorPosition).toBeGreaterThan(0);

    //     await fixture.changeGridSource(fixture.secondJsonInput);
    //     const newIndicatorPosition = await fixture.indicatorPosition(targetedTile);
    //     expect(newIndicatorPosition).toBe(0);
    //   });

    //   test("should reset all media controls to the paused state", async ({ fixture }) => {
    //     const targetedTile = 0;
    //     await fixture.playSpectrogram(targetedTile);

    //     const initialMediaControlsState = await fixture.areMediaControlsPlaying(targetedTile);
    //     expect(initialMediaControlsState).toBe(true);

    //     await fixture.changeGridSource(fixture.secondJsonInput);

    //     const stateAfterSourceChange = await fixture.areMediaControlsPlaying(targetedTile);
    //     expect(stateAfterSourceChange).toBe(false);
    //   });

    //   test("should stop viewing history", async ({ fixture }) => {
    //     await fixture.makeDecision(0);
    //     await fixture.viewPreviousHistoryPage();
    //     const initialHistoryState = await fixture.isViewingHistory();
    //     expect(initialHistoryState).toBe(true);

    //     await fixture.changeGridSource(fixture.secondJsonInput);
    //     const newHistoryState = await fixture.isViewingHistory();
    //     expect(newHistoryState).toBe(false);
    //   });

    //   test("should deselect all sub-selections", async ({ fixture }) => {
    //     await fixture.createSubSelection([0, 1]);
    //     expect(await fixture.selectedTiles()).toHaveLength(2);

    //     await fixture.changeGridSource(fixture.secondJsonInput);
    //     expect(await fixture.selectedTiles()).toHaveLength(0);
    //   });
    // });
  });

  test.describe("progress bar", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.changeGridSize(3);
    });

    test("should not show the completed segment if a partial page of decisions is made ", async ({ fixture }) => {
      // make a decision about one of the tiles. Meaning that the grid should
      // not auto-page and the progress bar should not change
      await fixture.createSubSelection([0]);
      await fixture.makeDecision(0);

      const completedSegments = await fixture.gridProgressCompletedSegment().count();
      const viewHeadSegments = await fixture.gridProgressHeadSegment().count();

      expect(completedSegments).toBe(0);
      expect(viewHeadSegments).toBe(0);
    });

    test("should grow the view segments if a full page of decisions is made", async ({ fixture }) => {
      // by making a decision without sub-selecting, we expect all the tiles to
      // have the decision applied to them, meaning that the grid should auto
      // page and the progress bars completed and head segments should grow
      await fixture.makeDecision(0);

      const completedSegments = await fixture.gridProgressCompletedSegment().count();

      const expectedViewHeadWidth = await fixture.progressBarValueToPercentage(3);
      const realizedViewHeadWidth = await fixture.progressBarHeadSize();

      expect(completedSegments).toBe(0);
      expect(realizedViewHeadWidth).toBe(expectedViewHeadWidth);
    });

    test("should show the correct tooltips if a full page of decisions is made", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.page.waitForTimeout(1000);

      const expectedTooltip = "3 / 30 (10.00%) audio segments completed";
      const completedTooltips = await fixture.gridProgressBarCompletedTooltip().count();
      const realizedViewHeadTooltip = await fixture.progressBarViewHeadTooltip();

      expect(completedTooltips).toBe(0);
      expect(realizedViewHeadTooltip).toBe(expectedTooltip);
    });

    test("should not change the completed segment if the user navigates in history", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.viewPreviousHistoryPage();

      const expectedCompletedWidth = await fixture.progressBarValueToPercentage(3);
      const realizedCompletedWidth = await fixture.progressBarCompletedSize();

      expect(realizedCompletedWidth).toBe(expectedCompletedWidth);
    });

    test("should change the view head tooltips if the user navigates in history", async ({ fixture }) => {
      await fixture.makeDecision(0);
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
      await fixture.makeDecision(0);
      await fixture.viewPreviousHistoryPage();
      await fixture.continueVerifying();

      const expectedViewHeadWidth = await fixture.progressBarValueToPercentage(3);
      const realizedViewHeadWidth = await fixture.progressBarHeadSize();

      expect(realizedViewHeadWidth).toBe(expectedViewHeadWidth);
    });

    test("should have the the correct segment sizes if the user exits history", async ({ fixture }) => {
      await fixture.makeDecision(0);
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
      // we check the initial state of the axes component visibility to protect
      // against test state pollution/leakage
      const initialState = await fixture.areAxesVisible();
      expect(initialState).toBe(true);

      await fixture.showAxes(false);

      const realizedState = await fixture.areAxesVisible();
      expect(realizedState).toBe(false);
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

  // test.describe("viewing history", () => {
  //   test("should display a border around selected items", async ({ fixture }) => {
  //     const decisionToMake = 0;
  //     const expectedDecisionColor = await fixture.getDecisionColor(decisionToMake);
  //     const expectedSelectionHighlights = await fixture.getGridSize();

  //     await fixture.makeDecision(decisionToMake);
  //     await fixture.viewPreviousHistoryPage();

  //     const realizedColors = await fixture.tileHighlightColors();
  //     expect(realizedColors).toHaveLength(expectedSelectionHighlights);
  //     expect(realizedColors.every((color) => color === expectedDecisionColor)).toBe(true);
  //   });

  //   test("should only highlight decision buttons that have been used", async ({ fixture }) => {
  //     const decisionToMake = 0;
  //     await fixture.makeDecision(decisionToMake);
  //     await fixture.viewPreviousHistoryPage();

  //     const expectedHighlights = [decisionToMake];
  //     const realizedHighlights = await fixture.highlightedButtons();

  //     expect(realizedHighlights).toStrictEqual(expectedHighlights);
  //   });
  // });

  test.describe("pagination", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.changeGridSize(3);
    });

    test("should disable the previous button when there are no previous pages", async ({ fixture }) => {
      await expect(fixture.previousPageButton()).toBeDisabled();
    });

    test("should disable the previous page button when at the start of history", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await expect(fixture.previousPageButton()).toBeEnabled();

      await fixture.viewPreviousHistoryPage();
      await expect(fixture.previousPageButton()).toBeDisabled();
    });

    test("should show the next page button when viewing history", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.makeDecision(1);
      await fixture.viewPreviousHistoryPage();
      await expect(fixture.nextPageButton()).toBeVisible();
    });

    test("should disable the next button when there are no next pages", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.makeDecision(0);
      await fixture.viewPreviousHistoryPage();
      await expect(fixture.nextPageButton()).toBeVisible();
    });

    test("should hide the 'Continue Verifying' button when not viewing history", async ({ fixture }) => {
      expect(fixture.continueVerifyingButton()).not.toBeVisible();
    });

    test("should show the 'Continue Verifying' button when viewing history", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.viewPreviousHistoryPage();
      await expect(fixture.continueVerifyingButton()).toBeVisible();
      await expect(fixture.continueVerifyingButton()).toBeEnabled();
    });

    test("should start viewing history when the previous page button is clicked", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.makeDecision(0);
      await fixture.viewPreviousHistoryPage();
      const isViewingHistory = await fixture.isViewingHistory();

      expect(isViewingHistory).toBe(true);
    });

    test("should stop viewing history when the 'Continue Verifying' button is clicked", async ({ fixture }) => {
      await fixture.makeDecision(0);

      await fixture.viewPreviousHistoryPage();
      const initialViewingHistory = await fixture.isViewingHistory();
      expect(initialViewingHistory).toBe(true);

      await fixture.continueVerifying();
      const newViewingHistory = await fixture.isViewingHistory();
      expect(newViewingHistory).toBe(false);
    });

    test("should stop playing audio and reset time when the grid auto pages", async ({ fixture }) => {
      await fixture.playSpectrogram(0);
      await fixture.makeDecision(0);

      // because there is a small delay between a an auto-page being requested
      // and the page actually changing, we need to wait for a short period of
      // time before we can assert the state of the audio
      // the short delay is an intentional feature that allows the user to see
      // that the decision has been applied to the grid before the grid auto pages
      await fixture.page.waitForTimeout(1000);
      const postPagedPlayingState = await fixture.isAudioPlaying(0);
      const playbackTime = await fixture.audioPlaybackTime(0);

      expect(postPagedPlayingState).toBe(false);
      expect(playbackTime).toBe(0);
    });

    // TODO: finish auto paging tests
    // test.describe("auto paging", () => {});
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

        await fixture.createSubSelection([1]);
        await fixture.shortcutGridPause();

        const realizedPlayingStates = await fixture.playingSpectrograms();
        expect(realizedPlayingStates).toHaveLength(1);
      });
    });
  });

  test.describe("sub-selection", () => {
    const commonSelectionTests = () => {
      test("should select a tile when clicked", async ({ fixture }) => {
        const testSubSelection = [0];
        await fixture.createSubSelection(testSubSelection);

        const selectedTiles = await fixture.selectedTileIndexes();
        expect(selectedTiles).toEqual(testSubSelection);
      });

      test("should add a tile to a selection when the ctrl key is held", async ({ fixture }) => {
        const firstSubSelection = [0];
        const secondSubSelection = [1, 2];
        await fixture.createSubSelection(firstSubSelection);
        await fixture.createSubSelection(secondSubSelection, ["ControlOrMeta"]);

        const expectedSelectedTiles = firstSubSelection.concat(secondSubSelection);
        const selectedTiles = await fixture.selectedTileIndexes();
        expect(selectedTiles).toEqual(expectedSelectedTiles);
      });

      test("should select a positive range of tiles when the shift key is held", async ({ fixture }) => {
        const selectionStart = 0;
        const selectionEnd = 2;

        await fixture.subSelectRange(selectionStart, selectionEnd);

        const expectedSelectedTiles = [0, 1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });

      test("should select a negative range of tiles when the shift key is held", async ({ fixture }) => {
        const selectionStart = 2;
        const selectionEnd = 0;

        await fixture.subSelectRange(selectionStart, selectionEnd);

        const expectedSelectedTiles = [0, 1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });

      test("should add negative a range of tiles to a selection if ctrl + shift is held", async ({ fixture }) => {
        const selectionStart = 0;
        const selectionEnd = 2;

        await fixture.subSelectRange(selectionStart, selectionEnd, ["ControlOrMeta"]);

        const expectedSelectedTiles = [0, 1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });

      test("should select a tile using alt + number selection shortcuts", async ({ fixture, page }) => {
        // the first tile in the grid should always have Alt + 1 as its
        // selection keyboard shortcut
        await page.keyboard.press("Alt+1");

        const expectedSelectedTiles = [0];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });

      test("should select a tile using ctrl & alt + number selection shortcuts", async ({ fixture, page }) => {
        await page.keyboard.press("ControlOrMeta+Alt+1");

        const expectedSelectedTiles = [0];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });

      test("should be able to add a range using the alt key selection shortcuts", async ({ fixture, page }) => {
        await page.keyboard.press("Shift+Alt+1");
        await page.keyboard.press("Shift+Alt+3");

        const expectedSelectedTiles = [0, 1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });

      test("should add positive a range of tiles to a selection if ctrl + shift is held", async ({ fixture }) => {
        const selectionStart = 2;
        const selectionEnd = 0;

        await fixture.subSelectRange(selectionStart, selectionEnd, ["ControlOrMeta"]);

        const expectedSelectedTiles = [0, 1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });

      test("should have no operation if the same tile if shift clicked twice", async ({ fixture }) => {
        const subSelection = [1];

        await fixture.createSubSelection(subSelection, ["Shift"]);
        await fixture.createSubSelection(subSelection, ["Shift"]);

        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(subSelection);
      });

      // if this test is failing, it might be because the selection box is
      // triggering when dragging the brightness range input
      test("should not select when using the media controls brightness range input", async ({ fixture }) => {
        const targetTile = 2;
        await fixture.changeBrightness(targetTile, 0.5);

        const selectedTiles = await fixture.selectedTileIndexes();
        expect(selectedTiles).toHaveLength(0);
      });

      test.describe("highlight box selection", () => {
        // there is a human tendency to move the mouse by a very small amount when
        // clicking the primary mouse button
        // to prevent this, there should be a minimum move amount until we start
        // creating a selection box
        // we start the selection slightly outside the tile so that the grid tile
        // does not register the client event
        test("should not create a selection box if the user drags a small px amount", async ({ fixture }) => {
          const dragAmount: Pixel = 10;

          const targetTile = (await fixture.gridTileComponents())[0];
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

          const expectedSelectedTiles = [];
          const realizedSelectedTiles = await fixture.selectedTileIndexes();
          expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
        });

        test("should be able to select a tile", async ({ fixture }) => {
          const targetTile = (await fixture.gridTileComponents())[0];
          const targetLocation = await targetTile.boundingBox();
          if (!targetLocation) {
            throw new Error("Could not get the bounding box of the target tile");
          }

          const selectionBoxSize = { width: 100, height: 100 };
          const start: MousePosition = { x: targetLocation.x, y: targetLocation.y };
          const end: MousePosition = {
            x: targetLocation.x + selectionBoxSize.width,
            y: targetLocation.y + selectionBoxSize.height,
          };

          await fixture.createSelectionBox(start, end);

          const expectedSelectedTiles = [0];
          const realizedSelectedTiles = await fixture.selectedTileIndexes();
          expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
        });

        test("should be able to select multiple tiles", async ({ fixture }) => {
          const targetStartTile = (await fixture.gridTileComponents())[0];
          const targetEndTile = (await fixture.gridTileComponents())[1];

          const targetStartLocation = await targetStartTile.boundingBox();
          if (!targetStartLocation) {
            throw new Error("Could not get the bounding box of the start tile");
          }

          const targetEndLocation = await targetEndTile.boundingBox();
          if (!targetEndLocation) {
            throw new Error("Could not get the bounding box of the end tile");
          }

          const start: MousePosition = { x: targetStartLocation.x, y: targetStartLocation.y };
          const end: MousePosition = {
            x: targetEndLocation.x + targetEndLocation.width,
            y: targetEndLocation.y + targetEndLocation.height,
          };

          await fixture.createSelectionBox(start, end);

          const expectedSelectedTiles = [0, 1];
          const realizedSelectedTiles = await fixture.selectedTileIndexes();
          expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
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
          await fixture.createWithAppChrome();
          await fixture.dismissBootstrapDialog();

          const scrollX: Pixel = 0;
          const scrollY: Pixel = 100;
          await fixture.page.mouse.wheel(scrollX, scrollY);

          // we test selecting less than the amount that we have scrolled
          // because it is the most likely region of the application to break
          //
          // we start selecting from the amount that we have scrolled because
          // that will be the very top left of the screen
          const selectionBoxSize: Pixel = 50;
          const selectionBoxStart = { x: scrollX, y: scrollY };
          const selectionBoxEnd = {
            x: selectionBoxStart.x + selectionBoxSize,
            y: selectionBoxStart.y + selectionBoxSize,
          };

          await fixture.createSelectionBox(selectionBoxStart, selectionBoxEnd);

          const expectedSelectedTiles = [0];
          const realizedSelectedTiles = await fixture.selectedTileIndexes();
          expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
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
        await fixture.createSubSelection([0]);

        const rangeStart = 1;
        const rangeEnd = 2;
        await fixture.subSelectRange(rangeStart, rangeEnd);

        const expectedSelectedTiles = [1, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });
    };

    const tabletSelectionTests = () => {
      test.beforeEach(async ({ fixture }) => {
        await fixture.changeSelectionMode("tablet");
      });

      commonSelectionTests();

      test("should toggle a tiles selection state if the same tile is clicked twice", async ({ fixture }) => {
        await fixture.createSubSelection([0]);
        await fixture.createSubSelection([0]);

        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        await expect(realizedSelectedTiles).toHaveLength(0);
      });

      test("should not de-select other tiles when a tile is selected", async ({ fixture }) => {
        await fixture.createSubSelection([0]);
        await fixture.createSubSelection([2]);

        const expectedSelectedTiles = [0, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });

      test("should not de-select tiles when a range selection occurs", async ({ fixture }) => {
        await fixture.createSubSelection([0]);

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

    test("should select all tiles if ctrl + A is pressed", async ({ fixture, page }) => {
      await page.keyboard.press("ControlOrMeta+a");

      const expectedNumberOfSelected = await fixture.getGridSize();
      const realizedNumberOfSelected = await fixture.selectedTileIndexes();

      expect(realizedNumberOfSelected).toHaveLength(expectedNumberOfSelected);
    });

    test("should deselect all tiles if ctrl + D is pressed", async ({ fixture, page }) => {
      await fixture.createSubSelection([0]);
      const initialSelectedTiles = await fixture.selectedTileIndexes();
      expect(initialSelectedTiles).toHaveLength(1);

      await page.keyboard.press("ControlOrMeta+d");

      const realizedNumberOfSelected = await fixture.selectedTileIndexes();
      expect(realizedNumberOfSelected).toHaveLength(0);
    });

    test("should deselect all tiles if the escape key is pressed", async ({ fixture, page }) => {
      await fixture.createSubSelection([0]);
      const initialSelectedTiles = await fixture.selectedTileIndexes();
      expect(initialSelectedTiles).toHaveLength(1);

      await page.keyboard.press(ESCAPE_KEY);

      const realizedNumberOfSelected = await fixture.selectedTileIndexes();
      expect(realizedNumberOfSelected).toHaveLength(0);
    });
  });

  test.describe("spectrogram scaling attributes", () => {
    const testedScales: SpectrogramCanvasScale[] = ["stretch", "natural", "original"];
    testedScales.forEach((scale: SpectrogramCanvasScale) => {
      test.describe(`${scale} scaling`, () => {
        test.beforeEach(async ({ fixture }) => {
          await fixture.changeSpectrogramScaling(scale);
        });
      });
    });
  });

  test.describe("grid sizes", () => {
    test("should show new items when increasing the grid size", async ({ fixture }) => {
      await fixture.changeGridSize(3);

      const initialGridSize = await fixture.getGridSize();
      const newGridSize = initialGridSize + 1;

      const initialModels = await fixture.verificationGridTileModels();
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
        "koala" as any,
      );
      expectedNewModel.clientCached = AudioCachedState.REQUESTED;
      expectedNewModel.serverCached = AudioCachedState.REQUESTED;

      await fixture.changeGridSize(newGridSize);

      // we should see all previous models that were shown before we increased
      // the grid size plus an additional model that was created when we
      // increased the grid size by one
      const expectedModels: SubjectWrapper[] = [...initialModels, expectedNewModel];
      const newModels = await fixture.verificationGridTileModels();

      expect(newModels).toEqual(expectedModels);
    });

    // grid indexes are used to create sub-selection shortcut keys. If this test
    // fails, it is likely that sub-selection keyboard shortcuts do not work
    test("should have the correct grid tile indexes after increasing grid size", async ({ fixture }) => {
      await fixture.changeGridSize(3);

      const initialGridSize = await fixture.getGridSize();
      const newGridSize = initialGridSize + 1;
      await fixture.changeGridSize(newGridSize);

      const gridTileOfInterest = (await fixture.gridTileComponents()).at(-1);

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
      await fixture.makeDecision(0);
      await fixture.viewPreviousHistoryPage();

      const newGridSize = initialGridSize + 1;
      await fixture.changeGridSize(newGridSize);

      // we expect that the first two tiles will hold the same decision that we
      // made before we increased the grid size
      const firstTileDecisions = await fixture.getAppliedDecisions(0);
      const secondTileDecisions = await fixture.getAppliedDecisions(0);
      const undecidedTileDecisions = await fixture.getAppliedDecisions(0);

      expect(firstTileDecisions.length).toBeGreaterThan(0);
      expect(secondTileDecisions.length).toBeGreaterThan(0);
      expect(undecidedTileDecisions.length).toEqual(0);
    });

    test("should retain sub-selection after increasing grid size", async ({ fixture }) => {
      const initialGridSize = 2;
      await fixture.changeGridSize(initialGridSize);

      const testedSubSelection = [0, 1];
      await fixture.createSubSelection(testedSubSelection);
      const initialSelectedTiles = await fixture.selectedTileIndexes();

      expect(initialSelectedTiles).toEqual(testedSubSelection);
    });

    test("should retain decisions after increasing grid size", async ({ fixture }) => {
      const initialGridSize = 2;
      await fixture.changeGridSize(initialGridSize);

      // we sub-select the first tile and make a decision about it so that the
      // verification grid will not auto-page, because the second tile doesn't
      // have a decision applied to it
      await fixture.createSubSelection([0]);
      await fixture.makeDecision(0);

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
      await fixture.createSubSelection([1]);
      await fixture.makeDecision(0);

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

    const testedGridSizes: DynamicGridSizeTest[] = [
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
        device: changeToMobile,
        withoutSlotShape: { columns: 1, rows: 1 },
        withSlotShape: { columns: 1, rows: 1 },
      },
    ];

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

      test.describe(testConfig.deviceName, () => {
        test(`should have the correct grid shape`, async ({ fixture }) => {
          await testConfig.device(fixture.page);
          await fixture.create();
          await fixture.dismissBootstrapDialog();

          const realizedGridShape = await fixture.getGridShape();
          expect(realizedGridShape).toEqual(testConfig.withoutSlotShape);
        });

        // if these tests are failing it is a sign that the grid tile's
        // intersection observer is not working correctly
        test("should have the correct grid shape with slot content", async ({ fixture }) => {
          await testConfig.device(fixture.page);
          await fixture.create(testedSlotContent);
          await fixture.dismissBootstrapDialog();

          const realizedGridShape = await fixture.getGridShape();
          expect(realizedGridShape).toEqual(testConfig.withSlotShape);
        });

        test("should look correct", async ({ fixture }) => {
          await testConfig.device(fixture.page);
          await fixture.create();
          await fixture.dismissBootstrapDialog();

          await fixture.onlyShowTileOutlines();
          await expect(fixture.page).toHaveScreenshot();
        });

        test("should look correct with slot content", async ({ fixture }) => {
          await testConfig.device(fixture.page);
          await fixture.create(testedSlotContent);
          await fixture.dismissBootstrapDialog();

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

test.describe("decisions", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.changeGridSize(3);
    await fixture.dismissBootstrapDialog();
  });

  test("should be able to add a decisions to a sub-selection", async ({ fixture }) => {
    await fixture.createSubSelection([0]);
    await fixture.makeDecision(0);

    const firstTileDecisions = await fixture.getAppliedDecisions(0);
    expect(firstTileDecisions).toEqual([
      {
        confirmed: DecisionOptions.TRUE,
        tag: { text: "koala" },
      },
    ]);

    await fixture.createSubSelection([1]);
    await fixture.makeDecision(0);

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
    await fixture.makeDecision(1);

    const appliedDecisions = await fixture.allAppliedDecisions();
    expect(appliedDecisions).toEqual([
      { confirmed: DecisionOptions.FALSE, tag: { text: "koala" } },
      { confirmed: DecisionOptions.FALSE, tag: { text: "fish" } },
      { confirmed: DecisionOptions.FALSE, tag: { text: "kangaroo" } },
    ]);
  });

  test("should be able to change a decision", async ({ fixture }) => {
    await fixture.createSubSelection([0]);
    await fixture.makeDecision(0);

    const firstTileDecisions = await fixture.getAppliedDecisions(0);
    expect(firstTileDecisions).toEqual([
      {
        confirmed: DecisionOptions.TRUE,
        tag: { text: "koala" },
      },
    ]);

    // notice that the "confirmed" value has change from "true" to "false"
    // because we changed the decision
    await fixture.makeDecision(1);
    expect(firstTileDecisions).toEqual([
      {
        confirmed: DecisionOptions.FALSE,
        tag: { text: "koala" },
      },
    ]);
  });
});

test.describe("decision meter", () => {
  test.describe("classification task", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithClassificationTask();
      await fixture.changeGridSize(3);
      await fixture.dismissBootstrapDialog();
    });

    test("should have the correct number of segments in the progress meter", async ({ fixture }) => {
      const expectedSegments = 3;
      const realizedSegments = await fixture.gridTileProgressMeterSegments();
      expect(realizedSegments).toHaveLength(expectedSegments);
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
      const decision = 0;
      await fixture.makeDecision(decision);

      const expectedColors = [
        await fixture.getDecisionColor(decision),
        await fixture.panelColor(),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is made", async ({ fixture }) => {
      await fixture.makeDecision(0);

      const expectedTooltips = ["car (true)", "koala (no decision)", "bird (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    test("should have the correct colors when multiple decisions are made", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.makeDecision(2);

      const expectedColors = [
        await fixture.getDecisionColor(0),
        await fixture.getDecisionColor(2),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when multiple decisions are made", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.makeDecision(3);

      const expectedTooltips = ["car (true)", "koala (false)", "bird (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    test("should change colors when a the decision is changed", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.makeDecision(1);

      const expectedColors = [
        await fixture.getDecisionColor(1),
        await fixture.panelColor(),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is changed", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.makeDecision(1);

      const expectedTooltips = ["car (false)", "koala (no decision)", "bird (no decision)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });

    // these skip tests also assert that the progress meter behaves correctly
    // when navigating in history
    test("should have the correct colors when a decision is skipped", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.makeSkipDecision();

      // when the skip button is clicked, the next page rendered
      // therefore, if we want to see that the correct colors were applied, we
      // have to navigate back in history
      await fixture.viewPreviousHistoryPage();

      const expectedColors = [
        await fixture.getDecisionColor(0),
        await fixture.panelColor(),
        await fixture.panelColor(),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is skipped", async ({ fixture }) => {
      await fixture.makeDecision(0);
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
      await fixture.dismissBootstrapDialog();
    });

    test("should have the correct number of segments", async ({ fixture }) => {
      const expectedSegments = 1;
      const realizedSegments = await fixture.gridTileProgressMeterSegments();
      expect(realizedSegments).toHaveLength(expectedSegments);
    });

    test("should have the correct colors when a decision is made", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.viewPreviousHistoryPage();

      const expectedColors = [await fixture.getDecisionColor(0)];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when a decision is made", async ({ fixture }) => {
      await fixture.makeDecision(0);
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

      await fixture.dismissBootstrapDialog();
    });

    test("should have the correct number of segments", async ({ fixture }) => {
      const expectedSegments = 4;
      const realizedSegments = await fixture.gridTileProgressMeterSegments();
      expect(realizedSegments).toHaveLength(expectedSegments);
    });

    // make a verification decision and then make a classification decision
    // we should see that the progress meter is updated correctly
    test("should have the correct colors when decisions are made", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.makeDecision(3);

      const expectedColors = [
        await fixture.getDecisionColor(3),
        await fixture.panelColor(),
        await fixture.panelColor(),
        await fixture.getDecisionColor(0),
      ];
      const realizedColors = await fixture.progressMeterColors();
      expect(realizedColors).toEqual(expectedColors);
    });

    test("should have the correct tooltips when decisions are made", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.makeDecision(3);

      const expectedTooltips = ["car (false)", "bird (no decision)", "cat (no decision)", "verification: koala (true)"];
      const realizedTooltips = await fixture.progressMeterTooltips();
      expect(realizedTooltips).toEqual(expectedTooltips);
    });
  });
});

test.describe("verification grid with custom template", () => {
  test.describe("information cards", () => {
    test.beforeEach(async ({ fixture }) => {
      const customTemplate = `
        <oe-verification verified="true">Koala</oe-verification>
        <oe-verification verified="false">Not Koala</oe-verification>

        <template>
        <oe-info-card></oe-info-card>
        </template>
			`;
      await fixture.create(customTemplate);

      await fixture.changeGridSource(fixture.testJsonInput);
    });

    test("should show the information about the current tile", async ({ fixture }) => {
      const expectedInfoCard = [
        { key: "Filename", value: "20220130T160000+1000_SEQP-Samford-Dry-B_643356.flac" },
        { key: "FileId", value: "643,356" },
        { key: "Datetime", value: "2022-01-30T06:00:00.000Z" },
      ];

      const realizedInfoCard = await fixture.infoCardItem(0);
      expect(realizedInfoCard).toEqual(expectedInfoCard);
    });

    test.skip("should update correctly when paging", async ({ fixture }) => {
      await fixture.makeDecision(0);

      // because it can take a while for the next page to load, and the info
      // cards to update, we have to wait until we receive the "loaded" event
      // from the grid component that signals that the next page has been loaded
      await catchLocatorEvent(fixture.gridComponent(), "loaded");

      const expectedInfoCard = [
        { key: "Title 1", value: "Description 1" },
        { key: "Title 2", value: "Description 2" },
      ];
      const realizedInfoCard = await fixture.infoCardItem(0);
      expect(realizedInfoCard).toEqual(expectedInfoCard);
    });

    test.skip("should update correctly when viewing history", async ({ fixture }) => {
      await fixture.makeDecision(0);
      await fixture.viewPreviousHistoryPage();

      const expectedInfoCard = [
        { key: "Title 1", value: "Description 1" },
        { key: "Title 2", value: "Description 2" },
      ];
      const realizedInfoCard = await fixture.infoCardItem(0);
      expect(realizedInfoCard).toEqual(expectedInfoCard);
    });

    test.skip("should update correctly when changing the grid source", async ({ fixture }) => {
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
    await fixture.dismissBootstrapDialog();
  });

  test("should not select all tiles when ctrl + A is pressed inside the input box", async ({ fixture }) => {
    await fixture.hostAppInput().press("ControlOrMeta+a");
    const selectedTiles = await fixture.selectedTileIndexes();
    expect(selectedTiles).toHaveLength(0);
  });

  test("should not make a decision when using a shortcut in the host applications input", async ({ fixture }) => {
    await logEvent(fixture.page, "decision");

    // try both lowercase and uppercase shortcuts
    await fixture.hostAppInput().press("Y");
    await fixture.hostAppInput().press("y");

    await fixture.page.waitForTimeout(1_000);

    const events: unknown[] = await getEventLogs(fixture.page, "decision");
    expect(events).toHaveLength(0);
  });

  test("should not play spectrograms when the spacebar is pressed in the host app input", async ({ fixture }) => {
    // to give the grid tiles the best chance at playing the audio
    // (if the logic is faulty), we make a sub-selection first
    await fixture.createSubSelection([0]);
    await fixture.hostAppInput().press("Space");

    const isPlaying = await fixture.isAudioPlaying(0);
    expect(isPlaying).toEqual(false);
  });

  test("should allow ctrl + A once the verification grid regains focus", async ({ fixture }) => {
    await fixture.hostAppInput().press("ControlOrMeta+a");

    // select a tile to ensure that the grid has focus
    await fixture.createSubSelection([0]);
    await fixture.page.keyboard.press("ControlOrMeta+a");

    const expectedSelectedTiles = await fixture.getGridSize();
    const selectedTiles = await fixture.selectedTileIndexes();
    expect(selectedTiles).toHaveLength(expectedSelectedTiles);
  });

  test("should allow decision shortcuts once the verification grid regains focus", async ({ fixture }) => {
    await fixture.hostAppInput().press("y");

    await logEvent(fixture.page, "decision");

    // select a tile to ensure that the grid has focus
    await fixture.createSubSelection([0]);
    await fixture.page.keyboard.press("y");

    const events: unknown[] = await getEventLogs(fixture.page, "decision");
    expect(events).toHaveLength(1);
  });

  test("should allow the spacebar to play audio once the verification grid regains focus", async ({ fixture }) => {
    await fixture.hostAppInput().press("Space");

    // select a tile to ensure that the grid has focus
    await fixture.createSubSelection([0]);
    await fixture.page.keyboard.press("Space");

    const isPlaying = await fixture.isAudioPlaying(0);
    expect(isPlaying).toEqual(true);
  });
});
