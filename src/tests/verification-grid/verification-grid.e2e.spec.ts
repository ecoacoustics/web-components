import { Size } from "../../models/rendering";
import { catchLocatorEvent, changeToDesktop, changeToMobile, getBrowserValue, setBrowserAttribute } from "../helpers";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import { SpectrogramCanvasScale, VerificationGridComponent, VerificationGridTileComponent } from "../../components";
import { SubjectWrapper } from "../../models/subject";

test.describe("while the initial help dialog is open", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should show an initial help dialog", async ({ fixture }) => {
    const isHelpDialogOpen = await fixture.isHelpDialogOpen();
    expect(isHelpDialogOpen).toBe(true);
  });

  // test("should not be able to sub-select grid tiles with keyboard shortcuts", async ({ fixture }) => {
  //   // we press Alt+1 because it will always be the first tile in the grid
  //   // and will therefore always exist
  //   await fixture.gridComponent().press("Alt+1");
  //   const selectedTiles = await fixture.selectedTiles();
  //   expect(selectedTiles).toHaveLength(0);
  // });

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
      const expectedDecisions = ["Koala", "Not Koala"];
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
      await fixture.makeDecision(0);
      await expect(fixture.previousPageButton()).toBeEnabled();

      await fixture.viewPreviousHistoryPage();
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

      await fixture.continueVerifyingButton().click();
      const newViewingHistory = await fixture.isViewingHistory();
      expect(newViewingHistory).toBe(false);
    });

    test.skip("should be able to navigate around in history using previous and next", async () => {});

    // TODO: finish auto paging tests
    // test.describe("auto paging", () => {});
  });

  test.describe("sub-selection", () => {
    const desktopSelectionTests = () => {
      test.skip("should select a tile when clicked", () => {});

      test.skip("should de-select other tiles when a tile is selected", () => {});

      test.skip("should add a tile to a selection when the ctrl key is held", () => {});

      test.skip("should deselect other tiles the shift key is held", () => {});

      test.skip("should select one tile if the same tile if shift clicked twice", () => {});

      test.skip("should select a positive direction of tiles when the shift key is held", () => {});

      test.skip("should select a negative direction of tiles when the shift key is held", () => {});

      test.skip("should be able to add positive a range of tiles to a selection if ctrl + shift is held", () => {});

      test.skip("should be able to add negative a range of tiles to a selection if ctrl + shift is held", () => {});
    };

    const tabletSelectionTests = () => {
      test.skip("should select a tile when clicked", () => {});

      test.skip("should de-select other tiles when a tile is selected", () => {});

      test.skip("should add a tile to a selection when the ctrl key is held", () => {});

      test.skip("should deselect other tiles the shift key is held", () => {});

      test.skip("should select one tile if the same tile if shift clicked twice", () => {});

      test.skip("should select a positive direction of tiles when the shift key is held", () => {});

      test.skip("should select a negative direction of tiles when the shift key is held", () => {});

      test.skip("should be able to add positive a range of tiles to a selection if ctrl + shift is held", () => {});

      test.skip("should be able to add negative a range of tiles to a selection if ctrl + shift is held", () => {});
    };

    test.describe("explicit desktop selection mode", desktopSelectionTests);

    test.describe("explicit tablet selection mode", tabletSelectionTests);

    test.describe("default (desktop) selection mode", desktopSelectionTests);

    test.describe("default (mobile) selection mode", tabletSelectionTests);

    test("should select all tiles if ctrl + A is pressed", async ({ fixture, page }) => {
      await page.keyboard.press("Control+a");

      const expectedNumberOfSelected = await fixture.getGridSize();
      const realizedNumberOfSelected = await fixture.selectedTiles();

      expect(realizedNumberOfSelected).toHaveLength(expectedNumberOfSelected);
    });

    test("should deselect all tiles if the escape key is pressed", () => {});
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
        },
        "http://localhost:3000/example.flac",
        {
          text: "",
        },
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

test.describe("verification grid with custom template", () => {
  test.describe("information cards", () => {
    test.beforeEach(async ({ fixture }) => {
      const customTemplate = `
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
