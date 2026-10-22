import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import { DecisionOptions } from "../../models/decisions/decision";
import {
  fullyCompleteVerified,
  partialCompleteCompound,
  partialVerifiedSubjects,
} from "./verification-grid.e2e.datasets";

test.describe("resuming datasets", () => {
  test.describe("verification task", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithVerificationTask();
      await fixture.changeGridSource(partialVerifiedSubjects);

      // Most of these tests depend on a grid size of 4 because we typically
      // want to test four potential states.
      //
      // 1. That "true" decisions can be correctly parsed.
      // 2. That "false" decisions can be correctly parsed (this might fail if
      //    we are using "falsy" assertions to check if the data exists.)
      // 3. If there is no decision applied to a tile, it should be treated as
      //    undecided.
      // 4. Edge cases like having a verification for a tag that doesn't exist
      //    on the subject anymore.
      await fixture.changeGridSize(4);
    });

    test("should correctly apply previous decisions", async ({ fixture }) => {
      const expectedDecisions = [
        { confirmed: DecisionOptions.FALSE, tag: { text: "Insects" } },
        { confirmed: DecisionOptions.TRUE, tag: { text: "Noisy Miner" } },
        null,

        // Decision has been omitted because while the datasource item has a
        // "verified" property, there is no oe_tag field to determine what tag
        // was verified.
        null,
      ];

      const realizedDecisions = await fixture.allAppliedDecisions();

      expect(realizedDecisions).toEqual(expectedDecisions);
    });

    test("should show previous decisions in the tile progress meters", async ({ fixture }) => {
      const expectedMeterColors = [
        [await fixture.getVerificationColor(DecisionOptions.FALSE)],
        [await fixture.getVerificationColor(DecisionOptions.TRUE)],
        [await fixture.panelColor()],

        // In the dataset, this subject is verified as "false", but there is no
        // oe_tag attached to the subject to signify what tag was verified.
        // To prevent showing bad data, we expect that the verification is
        // omitted and the panel color should be used.
        [await fixture.panelColor()],
      ];
      const realizedMeterColors = await fixture.allProgressMeterColors();

      expect(realizedMeterColors).toEqual(expectedMeterColors);

      // Note that although the dataset uses the "koala" "tag" column for all
      // of the subjects, we have explicitly set the "oe_tag" column to test
      // that the verified tag is correctly pulled from the "oe_tag" column.
      //
      // We use the oe_tag column to determine the verified tag instead of the
      // "tag" column so if tags are added/removed from the subject, the
      // verification will still be attached to the correct (although now
      // missing) tag.
      // If I instead used the "tag" column and the tag was removed, the
      // verification information would be incorrect.
      const expectedMeterTooltips = [
        ["verification: Insects (false)"],
        ["verification: Noisy Miner (true)"],
        ["verification: no decision"],

        // In this example, the we cannot determine the tag that was verified
        // because there is no "oe_tag" column.
        // Therefore, the verification should be omitted and shown as "no
        // decision".
        ["verification: no decision"],
      ];
      const realizedMeterTooltips = await fixture.allProgressMeterTooltips();

      expect(realizedMeterTooltips).toEqual(expectedMeterTooltips);
    });

    test("should show resume button if the grid size is decreased to only completed tiles", async ({ fixture }) => {
      // After decreasing the grid size to 2, all of the tiles will be
      // verified, so the "Continue Verifying" button should be shown and go
      // to the second page of the dataset after clicking it because the third
      // item (first item on the second page) is not verified.
      //
      // We push this scenario to its limit because the third item has no
      // decision, but the fourth item has a decision, so the second page will
      // be almost complete with the first item missing.
      await fixture.changeGridSize(2);

      await expect(fixture.continueVerifyingButton()).toBeVisible();
    });

    test.fixme("should remove decisions if the dataset changes", async ({ fixture }) => {
      await fixture.changeGridSource(fixture.testJsonInput);

      const panelColor = await fixture.panelColor();
      const expectedMeterColors = [[panelColor], [panelColor], [panelColor], [panelColor]];

      const realizedMeterColors = await fixture.allProgressMeterColors();
      expect(realizedMeterColors).toEqual(expectedMeterColors);

      const noDecisionTooltip = "verification: no decision";
      const expectedMeterTooltips = [
        [noDecisionTooltip],
        [noDecisionTooltip],
        [noDecisionTooltip],
        [noDecisionTooltip],
      ];

      const realizedMeterTooltips = await fixture.allProgressMeterTooltips();
      expect(realizedMeterTooltips).toEqual(expectedMeterTooltips);
    });
  });

  test.describe("compound tasks", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithCompoundTask();
      await fixture.changeGridSource(partialCompleteCompound);
      await fixture.changeGridSize(4);
    });

    test("should evaluate the decision buttons 'when' conditions", () => {});

    test.fixme("should show new tag decisions correctly", async ({ fixture }) => {
      const expectedTagText: string[] = [
        // Where "Koala" was corrected to "Brush Turkey"
        "koala Brush Turkey",
        "koala",

        // Where "Insects" was corrected to "Panda"
        "koala Panda",

        // Where there was no initial tag, but the newTag was set to
        // "Brush Turkey".
        "Brush Turkey",
      ];

      // We useInnerText because I observed slight differences with how
      // whitespace is stripped on Ubuntu (compared to Windows & MacOS)
      await expect(fixture.gridTileTagText()).toHaveText(expectedTagText, { useInnerText: true });

      const expectedMeterTooltips = [
        ["verification: Koala (false)", "new tag: Brush Turkey"],
        ["verification: Noisy Miner (true)", "new tag: no decision"],
        ["verification: Insects (true)", "new tag: Panda"],
        ["verification: no decision", "new tag: Brush Turkey"],
      ];
      const realizedMeterTooltips = await fixture.allProgressMeterTooltips();

      expect(realizedMeterTooltips).toEqual(expectedMeterTooltips);
    });

    test("should show resume button if the grid size is decreased to only completed tiles", async ({ fixture }) => {
      await fixture.changeGridSize(2);
      await expect(fixture.continueVerifyingButton()).toBeVisible();
    });
  });

  test.describe.fixme("no task", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithNoTask();
    });

    test("should create new colors for new tag decisions", async ({ fixture }) => {
      // Before creating a compound task, we expect that the newTag decision
      // color will not be defined because there is no "oe-tag-prompt"
      // component in the fixture.
      // However, once we add a subject that has a "newTag" decision, we
      // should see that the color service creates a new color for the newTag
      // decision type.
      await fixture.changeGridSource(partialCompleteCompound);
    });
  });

  test.describe.fixme("resuming a fully completed dataset", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithVerificationTask();
      await fixture.changeGridSource(fullyCompleteVerified);
      await fixture.changeGridSize(4);
    });

    test("should show 'resume verification' button", async ({ fixture }) => {
      await expect(fixture.continueVerifyingButton()).toBeVisible();
    });
  });

  // I have purposely decided to not decided to implement resuming
  // classification tasks because the format we provide uses the
  // classification_column_name ::= "oe_"<tag_name> format.
  // This strongly couples classification tasks to the data format, meaning
  // that any changes to the data format would be a breaking change for the
  // classification task.
  //
  // To prevent this, I want to keep the re-scope the classification download
  // format so that breaking changes do not leak.
  // TODO: Add tests once we improve the classification download namespace
  // see: https://github.com/ecoacoustics/web-components/issues/463
  test.describe.skip("classification task", () => {});
});
