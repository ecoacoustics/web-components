import { getBrowserValue, pressKey } from "../helpers/helpers";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
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
import { MousePosition, VerificationGridComponent } from "../../components/verification-grid/verification-grid";

test.describe("single verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.describe("sub-selection", () => {
    const commonSelectionTests = () => {
      test("should select a tile when clicked", async ({ fixture }) => {
        const testSubSelection = 0;
        await fixture.subSelect(testSubSelection);

        const selectedTiles = await fixture.selectedTileIndexes();
        expect(selectedTiles).toEqual([testSubSelection]);

        expect(await fixture.focusedIndex()).toEqual(0);
      });

      test("should add a tile to a selection when the ctrl key is held", async ({ fixture }) => {
        const firstSubSelection = [0];
        const secondSubSelection = [1, 2];
        await fixture.subSelect(firstSubSelection);
        await fixture.subSelect(secondSubSelection, ["ControlOrMeta"]);

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

      test("should range select from the start if nothing is selected", async ({ fixture }) => {
        await fixture.subSelect(3, ["Shift"]);
        expect(await fixture.selectedTileIndexes()).toEqual([0, 1, 2, 3]);
        expect(await fixture.focusedIndex()).toEqual(3);
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

        await fixture.subSelect(subSelection, ["Shift"]);
        await fixture.subSelect(subSelection, ["Shift"]);

        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual([0, 1]);

        expect(await fixture.focusedIndex()).toEqual(1);
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

          const realizedSelectedTiles = await fixture.selectedTileIndexes();
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

          const selectedTiles = await fixture.selectedTileIndexes();
          expect(selectedTiles).toHaveLength(0);
        });

        test("should be able to select new tiles if the grid size increases", async ({ fixture }) => {
          const currentGridSize = await fixture.getGridSize();
          await fixture.changeGridSize(currentGridSize + 1);

          await fixture.highlightSelectAllTiles();

          const expectedNumberOfSelected = await fixture.getGridSize();
          const realizedSelectedTiles = await fixture.selectedTileIndexes();
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
          const realizedSelectedTiles = await fixture.selectedTileIndexes();

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
          await fixture.subSelect(0);

          await fixture.highlightSelectTiles(2, 3);

          const selectedTiles = await fixture.selectedTileIndexes();
          expect(selectedTiles).toEqual([2, 3]);
        });

        test("should add to the current selection if ctrl key is held", async ({ fixture }) => {
          await fixture.subSelect(0);

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

        await fixture.subSelect(firstSelection);
        await fixture.subSelect(secondSelection);

        const realizedSelectedTiles = await fixture.selectedTileIndexes();

        // because we are in desktop selection mode, only the second selection
        // should be active because the first selection should have been
        // de-selected
        expect(realizedSelectedTiles).toHaveLength(1);
        expect(realizedSelectedTiles).toEqual(secondSelection);
      });

      test("should deselect other tiles the shift key is held", async ({ fixture }) => {
        await fixture.subSelect(0);

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

        test("should select the last tile if LEFT is pressed with nothing selected", async ({ fixture }) => {
          await fixture.page.keyboard.press(LEFT_ARROW_KEY);
          expect(await fixture.selectedTileIndexes()).toEqual([0]);
          expect(await fixture.focusedIndex()).toEqual(0);
        });

        test("should select the last tile if the UP is pressed with nothing selected", async ({ fixture }) => {
          await fixture.page.keyboard.press(UP_ARROW_KEY);
          expect(await fixture.selectedTileIndexes()).toEqual([0]);
          expect(await fixture.focusedIndex()).toEqual(0);
        });

        test("should select the first tile if HOME is pressed with nothing selected", async ({ fixture }) => {
          await fixture.page.keyboard.press(HOME_KEY);
          expect(await fixture.selectedTileIndexes()).toEqual([0]);
          expect(await fixture.focusedIndex()).toEqual(0);
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
          await fixture.subSelect(1);

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
          await fixture.subSelect(2);

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
          await fixture.subSelect(2);

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

        test("should be able to move the focus head to the start/end with ctrl + home/end", async ({ fixture }) => {
          await fixture.subSelect(1);

          // Because we moved the focus head with Ctrl + Home, we expect that
          // the selection head will not move.
          await pressKey(fixture.page, HOME_KEY, ["ControlOrMeta"]);
          expect(await fixture.focusedIndex()).toEqual(0);
          expect(await fixture.selectedTileIndexes()).toEqual([1]);

          const lastTileIndex = (await fixture.getGridSize()) - 1;
          await pressKey(fixture.page, END_KEY, ["ControlOrMeta"]);
          expect(await fixture.focusedIndex()).toEqual(lastTileIndex);
          expect(await fixture.selectedTileIndexes()).toEqual([1]);
        });

        // If the focus head becomes unaligned with the selection head, the next
        // selection movement should move from the focus head position.
        // This mimics the behavior of the Window's file explorer where
        // selection will always start from the focus head.
        test("should resume selection from the focus head", async ({ fixture }) => {
          await fixture.subSelect(2);

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
          await fixture.subSelect(2);

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
          await fixture.subSelect(2);

          // We have made assertions above that this works correctly, therefore
          // I do not need to make another assertion here.
          // We should be on tile index three (3).
          await pressKey(fixture.page, RIGHT_ARROW_KEY, ["Shift"]);

          await pressKey(fixture.page, RIGHT_ARROW_KEY);
          expect(await fixture.focusedIndex()).toEqual(4);
          expect(await fixture.selectedTileIndexes()).toEqual([4]);
        });

        test("should keyboard select from the last selected tile after negative range select", async ({ fixture }) => {
          await fixture.subSelect(2);

          await pressKey(fixture.page, LEFT_ARROW_KEY, ["Shift"]);

          await pressKey(fixture.page, LEFT_ARROW_KEY);
          expect(await fixture.focusedIndex()).toEqual(0);
          expect(await fixture.selectedTileIndexes()).toEqual([0]);
        });

        // Clicking between the tiles or the whitespace around decision buttons
        // should keep the verification grid focused, allowing shortcut keys to
        // work.
        test("should be able to use keyboard shortcuts if an empty space is clicked", async ({ fixture }) => {
          await fixture.page.locator(".verification-container").click();

          await fixture.page.keyboard.press("Alt+1");
          expect(await fixture.selectedTileIndexes()).toEqual([0]);
          expect(await fixture.focusedIndex()).toEqual(0);
        });
      });
    };

    const tabletSelectionTests = () => {
      test.beforeEach(async ({ fixture }) => {
        await fixture.changeSelectionMode("tablet");
      });

      commonSelectionTests();

      test("should toggle a tiles selection state if the same tile is clicked twice", async ({ fixture }) => {
        await fixture.subSelect(0);
        await fixture.subSelect(0);

        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toHaveLength(0);
      });

      test("should not de-select other tiles when a tile is selected", async ({ fixture }) => {
        await fixture.subSelect(0);
        await fixture.subSelect(2);

        const expectedSelectedTiles = [0, 2];
        const realizedSelectedTiles = await fixture.selectedTileIndexes();
        expect(realizedSelectedTiles).toEqual(expectedSelectedTiles);
      });

      test("should not de-select tiles when a range selection occurs", async ({ fixture }) => {
        await fixture.subSelect(0);

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
      const realizedNumberOfSelected = await fixture.selectedTileIndexes();

      expect(realizedNumberOfSelected).toHaveLength(expectedNumberOfSelected);
    });

    test("should deselect all tiles if ctrl + D is pressed", async ({ fixture }) => {
      await fixture.subSelect(0);
      const initialSelectedTiles = await fixture.selectedTileIndexes();
      expect(initialSelectedTiles).toHaveLength(1);

      await fixture.page.keyboard.press("ControlOrMeta+d");

      const realizedNumberOfSelected = await fixture.selectedTileIndexes();
      expect(realizedNumberOfSelected).toHaveLength(0);
    });

    test("should deselect all tiles if the escape key is pressed", async ({ fixture }) => {
      await fixture.subSelect(0);
      const initialSelectedTiles = await fixture.selectedTileIndexes();
      expect(initialSelectedTiles).toHaveLength(1);

      await fixture.page.keyboard.press(ESCAPE_KEY);

      const realizedNumberOfSelected = await fixture.selectedTileIndexes();
      expect(realizedNumberOfSelected).toHaveLength(0);
    });
  });
});
