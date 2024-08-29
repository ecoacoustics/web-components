import { Size } from "../../models/rendering";
import { catchLocatorEvent, changeToDesktop, changeToMobile, getBrowserValue, setBrowserAttribute } from "../helpers";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import {
  MousePosition,
  SpectrogramCanvasScale,
  VerificationGridComponent,
  VerificationGridTileComponent,
} from "../../components";
import { SubjectWrapper } from "../../models/subject";
import { ESCAPE_KEY } from "../../helpers/keyboard";
import { Pixel } from "../../models/unitConverters";

test.describe("while the initial help dialog is open", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should show an initial help dialog", async ({ fixture }) => {
    const isHelpDialogOpen = await fixture.isHelpDialogOpen();
    expect(isHelpDialogOpen).toBe(true);
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
    const userDecisions = await fixture.userDecisions();
    expect(userDecisions).toHaveLength(0);
  });

  test("should have an option to not show the help dialog again", async ({ fixture }) => {
    const element = fixture.helpDialogPreference();
    await expect(element).toBeVisible();
  });
});

test.describe("single verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();

    // because the user should not be able to start interacting with the
    // verification grid while the help dialog is open, we need to dismiss it
    // before we start asserting the functionality of the verification grid
    await fixture.dismissHelpDialog();
  });

  test.describe("initial state", () => {
    test("should have the correct grid size", async ({ fixture }) => {
      const expectedGridSize = 3;
      const gridSize = await fixture.getGridSize();
      expect(gridSize).toEqual(expectedGridSize);
    });

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
  });

  // unlike the initial help dialog, these tests assert that the help dialog
  // explicitly opened by the user (through the question mark button) behaves
  // correctly
  test.describe("help dialog", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.openHelpDialog();
    });

    test("should open when the help button is clicked", async ({ fixture }) => {
      const isHelpDialogOpen = await fixture.isHelpDialogOpen();
      expect(isHelpDialogOpen).toBe(true);
    });

    test("should not have an option to now show the help dialog again", async ({ fixture }) => {
      expect(fixture.helpDialogPreference()).toBeHidden();
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

    test.skip("should be able to navigate around in history using previous and next", async () => {});

    // TODO: finish auto paging tests
    // test.describe("auto paging", () => {});
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

      test("should be able to select a tile using the selection box", async ({ fixture }) => {
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

      test("should be able to select multiple tiles using the selection box", async ({ fixture }) => {
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

      // if this test is failing, it might be because the selection box is
      // triggering when dragging the brightness range input
      test("should not select when using the media controls brightness range input", async ({ fixture }) => {
        const targetTile = 2;
        await fixture.changeBrightness(targetTile, 0.5);

        const selectedTiles = await fixture.selectedTileIndexes();
        expect(selectedTiles).toHaveLength(0);
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

  test.describe("changing grid size", () => {
    test("should show new items when increasing the grid size", async ({ fixture }) => {
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
      expectedNewModel.clientCached = true;
      expectedNewModel.serverCached = true;
      expectedNewModel.decisions = {} as any;

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
    test("should have the correct grid index after increasing grid size", async ({ fixture }) => {
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
      // increase the grid size by one item, then remove it
      // we should see that the
      const initialGridSize = await fixture.getGridSize();
      await fixture.changeGridSize(initialGridSize + 1);
      await fixture.changeGridSize(initialGridSize);

      const expectedPagedItems = 0;
      const realizedPagedItems = await fixture.getPagedItems();

      expect(realizedPagedItems).toBe(expectedPagedItems);
    });
  });

  // during progressive creation, individual elements will be added to the
  // document, meaning that the verification grid is in various invalid states
  test.describe("progressive creation of a verification grid", () => {});
});

test.describe("decision meter", () => {
  test.describe("classification task", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create(`
        <oe-classification tag="car" true-shortcut="h"></oe-classification>
        <oe-classification tag="koala" true-shortcut="j"></oe-classification>
        <oe-classification tag="bird" true-shortcut="k"></oe-classification>
      `);

      await fixture.dismissHelpDialog();
    });

    test("should have the correct number of segments in the progress meter", async ({ fixture }) => {
      const expectedSegments = 3;
      const realizedSegments = await fixture.gridTileProgressMeterSegments();
      expect(realizedSegments).toHaveLength(expectedSegments);
    });

    test("should have the correct colors without a decision", async ({ fixture }) => {
      const expectedColors = Array.from({ length: 3 }).fill(await fixture.panelColor());
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
      await fixture.create(`
        <oe-verification verified="true"></oe-verification>
        <oe-verification verified="false"></oe-verification>
      `);

      await fixture.dismissHelpDialog();
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

      const expectedTooltips = ["koala (true)"];
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

      await fixture.dismissHelpDialog();
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

      const expectedTooltips = ["car (false)", "bird (no decision)", "cat (no decision)", "koala (true)"];
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
