import { catchLocatorEvent, getBrowserValue } from "../helpers/helpers";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import { SubjectWrapper } from "../../models/subject";
import { DecisionOptions } from "../../models/decisions/decision";
import { DecisionMadeEvent } from "../../components/verification-grid/verification-grid";
import { VerificationGridTileComponent } from "../../components/verification-grid-tile/verification-grid-tile";

test.describe("decisions", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.changeGridSize(3);
  });

  test("should be able to add a decisions to a sub-selection", async ({ fixture }) => {
    await fixture.subSelect(0);
    await fixture.makeVerificationDecision("true");

    const firstTileDecisions = await fixture.getAppliedDecisions(0);
    expect(firstTileDecisions).toEqual([
      {
        confirmed: DecisionOptions.TRUE,
        tag: { text: "koala" },
      },
    ]);

    await fixture.subSelect(1);
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

    // We will have to go back a page in history because making a decision about
    // an entire page will cause the verification grid to auto-page.
    await fixture.viewPreviousHistoryPage();

    const appliedDecisions = await fixture.allAppliedDecisions();
    expect(appliedDecisions).toEqual([
      { confirmed: DecisionOptions.FALSE, tag: { text: "koala" } },
      { confirmed: DecisionOptions.FALSE, tag: { text: "fish" } },
      { confirmed: DecisionOptions.FALSE, tag: { text: "kangaroo" } },
    ]);
  });

  test("should be able to change a decision", async ({ fixture }) => {
    const testedTileIndex = 0;

    await fixture.subSelect(testedTileIndex);
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
    await fixture.subSelect(testedTileIndex);

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

  test.skip("should emit the correct event", async ({ fixture }) => {
    const targetTile = 0;

    const decisionEvent = catchLocatorEvent<CustomEvent<DecisionMadeEvent>>(fixture.gridComponent(), "decision-made");
    await fixture.subSelect(0);
    await fixture.makeVerificationDecision("true");

    const targetGridTile = fixture.gridTileComponents().nth(targetTile);
    const tileSubjectWrapper = await getBrowserValue<VerificationGridTileComponent, SubjectWrapper>(
      targetGridTile,
      "model",
    );

    const realizedResult = await decisionEvent;
    const expectedResult = new Map([
      [
        tileSubjectWrapper,
        {
          changes: {
            verification: tileSubjectWrapper.verification,
          },
        },
      ],
    ]);

    expect(realizedResult).toEqual(expectedResult);
  });

  test.describe("auto advancing head", () => {
    test("should advance the selection head if one item is selected", async ({ fixture }) => {
      // I purposely select the second tile here without making a decision about
      // the first tile, so that this test will fail if we are just picking the
      // first incomplete tile.
      // Note that the correct expected behavior is to only auto-select
      // incomplete tiles ahead of the current selection and wrap to the first
      // incomplete if there are no more ahead of the current selection.
      await fixture.subSelect(1);
      await fixture.makeVerificationDecision("true");

      expect(await fixture.selectedTileIndexes()).toEqual([2]);
      expect(await fixture.focusedIndex()).toEqual(2);
    });

    test("should not advance the selection head if multiple items are selected", async ({ fixture }) => {
      // Note that I make the same verification decision in tests asserting the
      // automatically advancing head so that I can isolate any failures to the
      // selection, and not the decision.
      await fixture.subSelect([0, 1], ["ControlOrMeta"]);
      expect(await fixture.selectedTileIndexes()).toEqual([0, 1]);
      expect(await fixture.focusedIndex()).toEqual(1);

      await fixture.makeVerificationDecision("true");

      expect(await fixture.selectedTileIndexes()).toEqual([0, 1]);
      expect(await fixture.focusedIndex()).toEqual(1);
    });

    test("should skip tiles with decisions", async ({ fixture }) => {
      await fixture.subSelect(1);
      await fixture.makeVerificationDecision("true");

      await fixture.subSelect(0);
      await fixture.makeVerificationDecision("true");

      // We should see that the tile at index 1 was skipped because it already
      // has a decision applied, and the auto-advancement should place the
      // selection and focus head on the third tile.
      expect(await fixture.selectedTileIndexes()).toEqual([2]);
      expect(await fixture.focusedIndex()).toEqual(2);
    });

    test("should advance to the first undecided tile if advancing past the end", async ({ fixture }) => {
      await fixture.subSelect(0);
      await fixture.makeVerificationDecision("true");

      const lastTileIndex = (await fixture.getGridSize()) - 1;
      await fixture.subSelect(lastTileIndex);
      await fixture.makeVerificationDecision("false");

      expect(await fixture.selectedTileIndexes()).toEqual([1]);
      expect(await fixture.focusedIndex()).toEqual(1);
    });
  });
});
