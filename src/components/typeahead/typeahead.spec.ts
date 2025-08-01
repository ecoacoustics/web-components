import {
  DOWN_ARROW_KEY,
  END_KEY,
  ENTER_KEY,
  ESCAPE_KEY,
  HOME_KEY,
  TAB_KEY,
  UP_ARROW_KEY,
} from "../../helpers/keyboard";
import { expect } from "../../tests/assertions";
import { catchLocatorEvent, getBrowserValue, pressKey, setBrowserAttribute } from "../../tests/helpers";
import { TypeaheadComponent } from "./typeahead";
import { typeaheadFixture as test } from "./typeahead.fixture";

test.beforeEach(async ({ fixture }) => {
  await fixture.create();
});

test.describe("search results", () => {
  test("should show the correct results", async ({ fixture }) => {
    const expectedResults: string[] = ["tag1", "tag2", "tag3", "tag4"];

    await fixture.inputBox().fill("tag");

    for (let i = 0; i < expectedResults.length; i++) {
      await expect(fixture.searchResults().nth(i)).toHaveText(expectedResults[i]);
    }
  });

  test("should limit search results to the max-items attribute", async ({ fixture }) => {
    await fixture.inputBox().fill("tag");
    await expect(fixture.searchResults()).toHaveCount(4);

    // Because we update the "max-items" attribute while results are shown, we
    // are also asserting that the "max-items" attribute is correctly reactive.
    await setBrowserAttribute<TypeaheadComponent>(fixture.component(), "max-items" as any, "2");
    await expect(fixture.searchResults()).toHaveCount(2);

    // Make an assertion that we can increase the max-items
    await setBrowserAttribute<TypeaheadComponent>(fixture.component(), "max-items" as any, "3");
    await expect(fixture.searchResults()).toHaveCount(3);
  });

  test("should be able to clear the typeahead using escape", async ({ fixture }) => {
    await fixture.inputBox().fill("tag");
    await expect(fixture.searchResults()).toHaveCount(4);

    // When the search box is empty, we expect that all of the possible
    // decisions will be shown.
    await pressKey(fixture.inputBox(), ESCAPE_KEY);
    await expect(fixture.searchResults()).toHaveCount(7);
  });

  // This test simulates clearing the input through browser-native actions.
  // E.g. the clear icon that appears on some Chrome distributions.
  test("should be able to clear the typeahead using browser actions", async ({ fixture }) => {
    await fixture.inputBox().fill("tag");
    await expect(fixture.searchResults()).toHaveCount(4);

    await fixture.inputBox().clear();
    await expect(fixture.searchResults()).toHaveCount(7);
  });

  test("should re-evaluate results if the search callback updates while results are shown", async ({ fixture }) => {
    await fixture.inputBox().fill("tag");
    await expect(fixture.searchResults()).toHaveCount(4);

    await fixture.component().evaluate((element: TypeaheadComponent) => {
      element.search = () => ["tag5", "tag6"];
    });

    await expect(fixture.searchResults()).toHaveCount(2);
  });

  test("should re-evaluate text if the text converter updates while results are shown", async ({ fixture }) => {
    const expectedInitialValue = ["tag1", "tag2", "tag3", "tag4"];
    const expectedFinalValue = ["testing", "testing", "testing", "testing"];

    await fixture.inputBox().fill("tag");
    for (let i = 0; i < expectedInitialValue.length; i++) {
      await expect(fixture.searchResults().nth(i)).toHaveText(expectedInitialValue[i]);
    }

    await fixture.component().evaluate((element: TypeaheadComponent) => {
      element.textConverter = () => "testing";
    });

    for (let i = 0; i < expectedFinalValue.length; i++) {
      await expect(fixture.searchResults().nth(i)).toHaveText(expectedFinalValue[i]);
    }
  });

  test("should correctly show no search results", async ({ fixture }) => {
    await fixture.component().evaluate((element: TypeaheadComponent) => {
      element.search = () => [];
    });

    await expect(fixture.searchResults()).toHaveCount(0);
  });
});

test.describe("focus", () => {
  test("should focus the first item if there is nothing selected", async ({ fixture }) => {
    await fixture.inputBox().fill("tag");
    await expect(fixture.searchResults().first()).toHaveAttribute("aria-selected", "true");
  });

  test("should be able to correctly focus items using arrow keys", async ({ fixture }) => {
    // If the down arrow key is pressed while focused on the first item, there
    // should be no action.
    await fixture.inputBox().press(UP_ARROW_KEY);
    await expect(fixture.searchResults().first()).toHaveAttribute("aria-selected", "true");

    await fixture.inputBox().press(DOWN_ARROW_KEY);
    await expect(fixture.searchResults().nth(1)).toHaveAttribute("aria-selected", "true");

    // Assert that the first element that we just moved off of is no longer
    // selected.
    await expect(fixture.searchResults().first()).toHaveAttribute("aria-selected", "false");

    // Ensure that we can move to the second item to assert against off-by-one
    // errors.
    await fixture.inputBox().press(DOWN_ARROW_KEY);
    await expect(fixture.searchResults().nth(2)).toHaveAttribute("aria-selected", "true");

    await fixture.inputBox().press(DOWN_ARROW_KEY);
    await expect(fixture.searchResults().nth(3)).toHaveAttribute("aria-selected", "true");

    await fixture.inputBox().press(UP_ARROW_KEY);
    await expect(fixture.searchResults().nth(2)).toHaveAttribute("aria-selected", "true");
  });

  test("should be able to correctly focus items using tab", async ({ fixture }) => {
    // Pressing shift + tab while on the first element should have no effect.
    await pressKey(fixture.inputBox(), TAB_KEY, ["Shift"]);
    await expect(fixture.searchResults().first()).toHaveAttribute("aria-selected", "true");

    await pressKey(fixture.inputBox(), TAB_KEY);
    await expect(fixture.searchResults().nth(1)).toHaveAttribute("aria-selected", "true");

    // Assert that the first element that we just moved off of is no longer
    // selected.
    await expect(fixture.searchResults().first()).toHaveAttribute("aria-selected", "false");

    // Ensure that we can move to the second item to assert against off-by-one
    // errors.
    await pressKey(fixture.inputBox(), TAB_KEY);
    await expect(fixture.searchResults().nth(2)).toHaveAttribute("aria-selected", "true");

    await pressKey(fixture.inputBox(), TAB_KEY);
    await expect(fixture.searchResults().nth(3)).toHaveAttribute("aria-selected", "true");

    await pressKey(fixture.inputBox(), TAB_KEY, ["Shift"]);
    await expect(fixture.searchResults().nth(2)).toHaveAttribute("aria-selected", "true");
  });

  test("should be able to focus the first item using the HOME key", async ({ fixture }) => {
    await pressKey(fixture.inputBox(), HOME_KEY);
    await expect(fixture.searchResults().first()).toHaveAttribute("aria-selected", "true");
  });

  test("should be able to focus the last item using the END key", async ({ fixture }) => {
    await pressKey(fixture.inputBox(), END_KEY);
    await expect(fixture.searchResults().last()).toHaveAttribute("aria-selected", "true");
  });

  // I have copied the same behavior as the Google search typeahead, where if
  // the value changes, the focus head is reset.
  // Note that our typeahead behaves a bit different because the first item is
  // always selected.
  test("should reset the focus head to the first item if the user changes input", async ({ fixture }) => {
    await fixture.inputBox().fill("tag");

    await fixture.inputBox().press(DOWN_ARROW_KEY);
    await expect(fixture.searchResults().nth(1)).toHaveAttribute("aria-selected", "true");

    // Because we have removed the trailing "g" off the original input, we
    // expect that focus will be reset and the first item will be focused.
    await fixture.inputBox().fill("ta");
    await expect(fixture.searchResults().first()).toHaveAttribute("aria-selected", "true");
    await expect(fixture.searchResults().nth(1)).toHaveAttribute("aria-selected", "false");
  });

  test("should limit the focus to a new max-items value", async ({ fixture }) => {
    const maxItems = await getBrowserValue<TypeaheadComponent, number>(fixture.component(), "maxItems");

    // By pressing the down arrow by the number of max items, we can ensure that
    // we are focused on the last item.
    for (let i = 0; i < maxItems; i++) {
      await fixture.inputBox().press(DOWN_ARROW_KEY);
    }

    await setBrowserAttribute<TypeaheadComponent>(fixture.component(), "max-items" as any, "2");

    await expect(fixture.searchResults().nth(1)).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("selection emission", () => {
  test.fixme("should emit a model if enter is pressed without input", async ({ fixture }) => {
    const selectionEvent = catchLocatorEvent(fixture.component(), "typeahead-selected");

    await fixture.inputBox().press(ENTER_KEY);

    await expect(selectionEvent).resolves.toEqual({
      text: "Abbots Babbler",
    });
  });

  test("should emit a model on click selection", async ({ fixture }) => {
    const selectionEvent = catchLocatorEvent(fixture.component(), "typeahead-selected");

    await fixture.searchResults().nth(1).click();

    await expect(selectionEvent).resolves.toEqual({
      text: "Brush Turkey",
    });
  });

  test.fixme("should emit a model on enter selection", async ({ fixture }) => {
    const selectionEvent = catchLocatorEvent(fixture.component(), "typeahead-selected");

    await fixture.inputBox().press(DOWN_ARROW_KEY);
    await fixture.inputBox().press(DOWN_ARROW_KEY);
    await fixture.inputBox().press(DOWN_ARROW_KEY);
    await fixture.inputBox().press(UP_ARROW_KEY);

    // We should be on the 3rd item because we pressed down three times
    // (starting from the first item), and then pressed up.
    await fixture.inputBox().press(ENTER_KEY);

    await expect(selectionEvent).resolves.toEqual({
      text: "Brush Turkey",
    });
  });
});
