import { Size } from "../../models/rendering";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect, expectConsoleError } from "../assertions";

test.describe("single verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.describe("changing attributes", () => {
    test.describe("changing the grid size", () => {
      test("should react correctly to changing the grid size", async ({ fixture }) => {
        const expectedGridSize = 1;
        await fixture.changeGridSize(expectedGridSize);
        const gridSize = await fixture.getGridSize();
        expect(gridSize).toEqual(expectedGridSize);
      });

      test("should not allow a grid size that is a string", { tag: [expectConsoleError] }, async ({ fixture }) => {
        const initialGridSize = await fixture.getGridSize();
        const testGridSize = "this-is-not-a-number";

        await expect(async () => {
          // TypeScript correctly doesn't allow us to pass a string into the
          // grid-size attribute so we need the "as any" cast to bypass type
          // checking.
          // Not all environments use TypeScript, so we need to handle the cases
          // where a user passes an invalid datatype into the grid-size.
          await fixture.changeGridSize(testGridSize as any);
        }).toConsoleError(fixture.page, "Grid size must be a finite number. Received: 'NaN'");

        // because we requested an invalid grid size, we should see that the
        // grid size property does not change
        const realizedGridSize = await fixture.getGridSize();
        expect(realizedGridSize).toBe(initialGridSize);
      });

      test("should not allow a negative grid size", { tag: [expectConsoleError] }, async ({ fixture }) => {
        const initialGridSize = await fixture.getGridSize();
        const testGridSize = -12;

        await expect(async () => {
          await fixture.changeGridSize(testGridSize);
        }).toConsoleError(fixture.page, "Grid size must be a positive number. Received: '-12'");

        const realizedGridSize = await fixture.getGridSize();
        expect(realizedGridSize).toBe(initialGridSize);
      });

      test("should not allow a grid size that is zero", { tag: [expectConsoleError] }, async ({ fixture }) => {
        const initialGridSize = await fixture.getGridSize();
        const testGridSize = 0;

        await expect(async () => {
          await fixture.changeGridSize(testGridSize);
        }).toConsoleError(fixture.page, "Grid size must be a positive number. Received: '0'");

        const realizedGridSize = await fixture.getGridSize();
        expect(realizedGridSize).toBe(initialGridSize);
      });

      test("should not allow a grid size of negative infinity", { tag: [expectConsoleError] }, async ({ fixture }) => {
        const initialGridSize = await fixture.getGridSize();
        const testGridSize = -Infinity;

        await expect(async () => {
          await fixture.changeGridSize(testGridSize);
        }).toConsoleError(fixture.page, "Grid size must be a finite number. Received: '-Infinity'");

        const realizedGridSize = await fixture.getGridSize();
        expect(realizedGridSize).toBe(initialGridSize);
      });

      test("should not allow a grid size of Infinity", { tag: [expectConsoleError] }, async ({ fixture }) => {
        const initialGridSize = await fixture.getGridSize();
        const testGridSize = Infinity;

        await expect(async () => {
          await fixture.changeGridSize(testGridSize);
        }).toConsoleError(fixture.page, "Grid size must be a finite number. Received: 'Infinity'");

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
      // TODO: Fix this test. This test is completing with hanging event
      // listeners causing a page error.
      test.fixme("should reset all decision when changing the grid source", async ({ fixture }) => {
        const expectedDecisionLength = await fixture.getGridSize();
        await fixture.makeVerificationDecision("true");
        expect(await fixture.gridDecisions()).toHaveLength(expectedDecisionLength);

        await fixture.changeGridSource(fixture.secondJsonInput);
        expect(await fixture.gridDecisions()).toHaveLength(0);
      });

      test("should remove all sub-selections when changing the grid source", async ({ fixture }) => {
        const subSelection = [0, 1];
        await fixture.subSelect(subSelection, ["ControlOrMeta"]);
        expect(await fixture.selectedTileIndexes()).toHaveLength(subSelection.length);

        await fixture.changeGridSource(fixture.secondJsonInput);
        expect(await fixture.selectedTileIndexes()).toHaveLength(0);
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
});
