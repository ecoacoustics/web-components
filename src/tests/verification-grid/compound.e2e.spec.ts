import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";

test.describe("compound tasks", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.createWithCompoundTask();
  });

  test("should have a disabled tag-prompt component while the 'when' condition fails", async ({ fixture }) => {
    await expect(fixture.tagPromptButton()).toBeDisabled();

    // Because the tested "when" predicate will pass if the selected tiles
    // decision is "false", I want to assert that making a "true" decision will
    // not cause the tag-prompt button to incorrectly enable.
    await fixture.subSelect(0);
    await fixture.makeVerificationDecision("true");
    await expect(fixture.tagPromptButton()).toBeDisabled();

    // Because we had one tile selected, the decision head would have
    // automatically advanced, meaning that I want to test bringing it back to
    // the first tile.
    // I made an assertion about the newly selected tile above so that if there
    // is an order of operations error (e.g. move selection head, then
    // enable/disable buttons), this test will correctly fail.
    await fixture.subSelect(0);
    await expect(fixture.tagPromptButton()).toBeDisabled();

    // Now I test making a "false" decision which should enable the tag
    // correction button. I also expect that the selection head will not
    // automatically progress because there is a "new tag" task on
    // the currently selected tile.
    await fixture.makeVerificationDecision("false");
    expect(await fixture.selectedTileIndexes()).toEqual([0]);
    await expect(fixture.tagPromptButton()).toBeEnabled();

    // If I click on another tile where the "when" condition fails, I should
    // expect that the button becomes re-disabled.
    await fixture.subSelect(1);
    await expect(fixture.tagPromptButton()).toBeDisabled();
  });

  test("should emit the correct events", async ({ fixture }) => {
    const testedTile = 0;
    await fixture.subSelect(testedTile);

    // Make a "false" decision first so that the "when" condition passes, and
    // I can click the tag correction button.
    await fixture.makeVerificationDecision("false");

    // I make an assertion over the newTag property to ensure that the
    // "false" decision didn't incorrectly modify the "newTag ".
    const initialModel = (await fixture.verificationGridTileModels())[testedTile];
    expect(initialModel.newTag).toBeUndefined();

    await fixture.makeNewTagDecision("Brush Turkey");

    const newModel = (await fixture.verificationGridTileModels())[testedTile];
    expect(newModel.newTag).toBeDefined();
  });
});
