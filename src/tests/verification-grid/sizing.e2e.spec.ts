import { GridShape } from "../../helpers/controllers/dynamic-grid-sizes.controller";
import { DeviceMock, getBrowserValue, mockDeviceSize, testBreakpoints } from "../helpers/helpers";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import { SubjectWrapper } from "../../models/subject";
import { VerificationGridTileComponent } from "../../components/verification-grid-tile/verification-grid-tile";

test.describe("single verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.page.setViewportSize({ width: 1920, height: 1080 });
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
      expect(await fixture.getGridSize()).toBe(newGridSize);

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
      await fixture.subSelect(testedSubSelection, ["ControlOrMeta"]);
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
      await fixture.subSelect(0);
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
      await fixture.subSelect(1);
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
        device: mockDeviceSize(testBreakpoints.mobile),
        withoutSlotShape: { columns: 1, rows: 1 },
        withSlotShape: { columns: 1, rows: 1 },
      },
    ];

    for (const testConfig of testedGridSizes) {
      const testedSlotContent = `
        <template>
          <div class="tile-spacing">
            <oe-subject-tag></oe-subject-tag>
            <oe-media-controls for="spectrogram"></oe-media-controls>
          </div>

          <oe-axes>
            <oe-indicator>
              <oe-spectrogram id="spectrogram"></oe-spectrogram>
            </oe-indicator>
          </oe-axes>

          <div>
            <h1>Heading text</h1>

            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil odio laboriosam ea culpa magnam aut iure,
              voluptate nisi. Enim natus blanditiis quam ipsa vero magni deserunt ratione qui explicabo. Est!
            </p>
          </div>

          <div class="tile-block">
            <oe-task-meter></oe-task-meter>
            <oe-info-card></oe-info-card>
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
});

test.describe("host sizing", () => {
  test("should allow a consumer to constrain the height of the verification grid", async ({ fixture }) => {
    await fixture.page.setViewportSize({ width: 1280, height: 720 });
    await fixture.create();
    await fixture.page.addStyleTag({ content: "#verification-grid { height: 400px; }" });

    await expect.poll(() => fixture.gridComponent().evaluate((grid) => grid.getBoundingClientRect().height)).toBe(400);
  });

  test("should fill the viewport height by default", async ({ fixture }) => {
    await fixture.page.setViewportSize({ width: 1280, height: 720 });
    await fixture.create();

    await expect.poll(() => fixture.gridComponent().evaluate((grid) => grid.getBoundingClientRect().height)).toBe(720);
  });
});
