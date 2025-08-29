import { DOWN_ARROW_KEY, ENTER_KEY } from "../../../helpers/keyboard";
import { expect } from "../../../tests/assertions";
import {
  getCssVariableStyle,
  insertContent,
  pressKey,
  setBrowserAttribute,
  setBrowserValue,
} from "../../../tests/helpers";
import { TagPromptComponent } from "./tag-prompt";
import { tagPromptFixture as test } from "./tag-prompt.fixture";

test.beforeEach(async ({ fixture }) => {
  await fixture.create();
});

test.describe("slots", () => {
  test("should use the default slot for the button text", async ({ fixture }) => {
    await insertContent(fixture.component(), "Hello World!");

    // Note the > (must be direct child of) selector here.
    // I do this so that this assertion gets as close as possible to the content
    // without asserting over light DOM selectors.
    await expect(fixture.buttonText().locator("> slot")).toHaveSlottedText("Hello World!");
  });
});

test.describe("keyboard shortcuts", () => {
  test("should have a space space for a keyboard shortcut if none is provided", async ({ fixture }) => {
    await expect(fixture.shortcutLegend()).toHaveTrimmedText("");
  });

  test("should display a keyboard shortcut when provided", async ({ fixture }) => {
    await setBrowserAttribute<TagPromptComponent>(fixture.component(), "shortcut", "K");
    await expect(fixture.shortcutLegend()).toHaveTrimmedText("K");
  });

  test("should not display a keyboard shortcut when in tablet selection", async ({ fixture }) => {
    await setBrowserValue<TagPromptComponent>(fixture.component(), "isMobile", true);
  });
});

test.describe("decision colors", () => {
  test("should have the correct decision color", async ({ fixture }) => {
    const expectedColor = await getCssVariableStyle(
      fixture.decisionColorPill(),
      "--oe-unique-color-0-true",
      "background",
    );
    await expect(fixture.decisionColorPill()).toHaveCSS("background", expectedColor);
  });
});

// Asserting that the correct item is selected / emitted from the typeahead is
// tested inside of the typeahead component tests.
// The purpose of these tests is to assert that the correct NewTag
// decision model is constructed and that event listeners are connected
// correctly.
test.describe("decision emission", () => {
  test("should not open the popup if clicked when disabled", async ({ fixture }) => {
    await setBrowserValue(fixture.component(), "disabled", true);
    await expect(fixture.decisionButton()).toBeDisabled();

    // force = true bypasses accessibility checks. Because the button should
    // be disabled, it will fail accessability checked.
    // eslint-disable-next-line playwright/no-force-option
    await fixture.decisionButton().click({ force: true });
    await expect(fixture.typeaheadInput()).toBeHidden();
  });

  test("should not open the popup if the keyboard shortcut is pressed when disabled", async ({ fixture }) => {
    const testedShortcut = "K";
    await setBrowserAttribute<TagPromptComponent>(fixture.component(), "shortcut", testedShortcut);

    await pressKey(fixture.page, testedShortcut);

    await expect(fixture.typeaheadInput()).toBeHidden();
  });

  test.describe("when enabled", () => {
    test.beforeEach(async ({ fixture }) => {
      await setBrowserValue(fixture.component(), "disabled", false);
    });

    test("should open the popup if clicked", async ({ fixture }) => {
      await fixture.decisionButton().click();
      await expect(fixture.typeaheadInput()).toBeVisible();
    });

    test.skip("should open the popup if the keyboard shortcut is pressed", async ({ fixture }) => {
      const testedShortcut = "K";
      await setBrowserAttribute<TagPromptComponent>(fixture.component(), "shortcut", testedShortcut);

      await pressKey(fixture.page, testedShortcut);

      await expect(fixture.typeaheadInput()).toBeVisible();
    });

    // Additionally because we do not manually focus the input box, this test also
    // asserts that the typeahead should automatically steal focus.
    test.skip("should be able to select tag using the arrow keys", async ({ fixture }) => {
      await pressKey(fixture.typeaheadInput(), DOWN_ARROW_KEY);
      await pressKey(fixture.typeaheadInput(), ENTER_KEY);
    });
  });
});

// When creating an <oe-tag-prompt> component in HTML, you can provide possible
// tags through <option> elements instead of creating a JavaScript callback in
// the "search" attribute.
//
// If both <option> and "search" attributes are present, we prefer to use the
// "search" attribute.
// In the case of a conflict, we do not remove the <option> nodes, so that
// unsetting the "search" callback will use the <option> elements.
// To provide some debug information to the user, we do log a warning to the
// console in the case of a source conflict.
test.describe("declarative markup", () => {});
