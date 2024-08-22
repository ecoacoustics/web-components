import { decisionFixture as test } from "./decision.fixture";
import { getEventLogs, logEvent } from "../../tests/helpers";
import { sleep } from "../../helpers/utilities";
import { expect } from "../../tests/assertions";

test.describe("decision", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should not show decision highlight color on hover", async ({ fixture }) => {
    const decisionButton = fixture.decisionButton();
    await decisionButton.hover();
    expect(await fixture.isShowingDecisionColor()).toBe(false);
  });

  test("should display a shortcut tooltip on hover", async ({ fixture }) => {
    const decisionButton = fixture.decisionButton();
    await decisionButton.hover();
    const tooltip = await decisionButton.getAttribute("title");
    expect(tooltip).toBeTruthy();
  });

  test.skip("should show the decision color when the keyboard shortcut is held down", async ({ fixture }) => {
    const keyboardShortcut = "a";
    await fixture.changeKeyboardShortcut(keyboardShortcut);

    await fixture.page.dispatchEvent("html", "keydown", { key: keyboardShortcut });
    expect(await fixture.isShowingDecisionColor()).toBe(true);

    await fixture.page.dispatchEvent("html", "keyup", { key: keyboardShortcut });
    expect(await fixture.isShowingDecisionColor()).toBe(false);
  });

  test.skip("should show the decision color when the mouse is held down", async ({ fixture }) => {
    await fixture.decisionButton().dispatchEvent("pointerdown");
    expect(await fixture.isShowingDecisionColor()).toBe(true);

    await fixture.decisionButton().dispatchEvent("pointerup");
    expect(await fixture.isShowingDecisionColor()).toBe(false);
  });

  test.skip("should not show the decision color when the mouse is held down and disabled", async ({ fixture }) => {
    await fixture.changeDecisionDisabled(true);

    await fixture.decisionButton().dispatchEvent("pointerdown");
    expect(await fixture.isShowingDecisionColor()).toBe(false);

    await fixture.decisionButton().dispatchEvent("pointerup");
    expect(await fixture.isShowingDecisionColor()).toBe(false);
  });

  test.skip("should not show the decision color when the shortcut is held down and disabled", async ({ fixture }) => {
    const keyboardShortcut = "a";
    await fixture.changeDecisionDisabled(true);
    await fixture.changeKeyboardShortcut(keyboardShortcut);

    await fixture.page.dispatchEvent("html", "keydown", { key: keyboardShortcut });
    expect(await fixture.isShowingDecisionColor()).toBe(false);

    await fixture.page.dispatchEvent("html", "keyup", { key: keyboardShortcut });
    expect(await fixture.isShowingDecisionColor()).toBe(false);
  });

  test.skip("should stop showing the keyboard decision color when the escape key is pressed", async ({ fixture }) => {
    const keyboardShortcut = "a";
    await fixture.changeKeyboardShortcut(keyboardShortcut);

    await fixture.page.dispatchEvent("html", "keydown", { key: keyboardShortcut });
    expect(await fixture.isShowingDecisionColor()).toBe(true);

    await fixture.page.keyboard.press("Escape");
    expect(await fixture.isShowingDecisionColor()).toBe(false);

    await fixture.page.dispatchEvent("html", "keyup", { key: keyboardShortcut });
    expect(await fixture.isShowingDecisionColor()).toBe(false);
  });

  test.skip("should stop showing the mouse decision color when the escape key is pressed", async ({ fixture }) => {
    await fixture.decisionButton().dispatchEvent("pointerdown");
    expect(await fixture.isShowingDecisionColor()).toBe(true);

    await fixture.page.keyboard.press("Escape");
    expect(await fixture.isShowingDecisionColor()).toBe(false);

    await fixture.decisionButton().dispatchEvent("pointerup");
    expect(await fixture.isShowingDecisionColor()).toBe(false);
  });

  test("should display additional tags when provided", async ({ fixture }) => {
    const additionalTags = "tag1, tag2";
    const expectedAdditionalTagsText = `(${additionalTags})`;
    await fixture.changeDecisionAdditionalTags(additionalTags);

    const realizedAdditionalTags = await fixture.additionalTagsText();
    expect(realizedAdditionalTags).toEqual(expectedAdditionalTagsText);
  });

  test("should display a keyboard shortcut when provided", async ({ fixture }) => {
    const keyboardShortcut = "a";
    const expectedText = keyboardShortcut.toUpperCase();
    await fixture.changeKeyboardShortcut(keyboardShortcut);

    const realizedKeyboardShortcut = await fixture.shortcutText();
    expect(realizedKeyboardShortcut).toEqual(expectedText);
  });

  test("should display both additional tags and a keyboard shortcut when provided", async ({ fixture }) => {
    const additionalTags = "tag1, tag2";
    const keyboardShortcut = "a";
    const expectedAdditionalTagsText = `(${additionalTags})`;
    const expectedShortcutText = keyboardShortcut.toUpperCase();

    await fixture.changeDecisionAdditionalTags(additionalTags);
    await fixture.changeKeyboardShortcut(keyboardShortcut);

    const realizedAdditionalTags = await fixture.additionalTagsText();
    const realizedKeyboardShortcut = await fixture.shortcutText();

    expect(realizedAdditionalTags).toEqual(expectedAdditionalTagsText);
    expect(realizedKeyboardShortcut).toEqual(expectedShortcutText);
  });

  test("should have a spare space for additional tags even if not provided", async ({ fixture }) => {
    const realizedAdditionalTags = await fixture.additionalTagsText();
    expect(realizedAdditionalTags).toEqual("");
  });

  test("should have a spare space for a keyboard shortcut if not provided", async ({ fixture }) => {
    const realizedKeyboardShortcut = await fixture.shortcutText();
    expect(realizedKeyboardShortcut).toEqual("");
  });

  test("should not show keyboard shortcuts when in tablet selection mode", async ({ fixture }) => {
    await fixture.changeDecisionTabletSelection("tablet");

    const realizedKeyboardShortcut = await fixture.shortcutText();
    expect(realizedKeyboardShortcut).toBe("");
  });

  test.describe("events", () => {
    // we should only see the keyboard shortcut trigger on pointerup
    // this allows the user to cancel the decision with the escape key if they
    // change their mind after clicking
    test("should emit an event when clicked", async ({ fixture }) => {
      const decisionEvent = fixture.decisionEvent();
      await fixture.decisionButton().click();
      await expect(decisionEvent).resolves.toBeTruthy();
    });

    // we should only see the keyboard shortcut trigger on keyup
    test("should emit an event when the keyboard shortcut is pressed", async ({ fixture }) => {
      const keyboardShortcut = "a";

      const decisionEvent = fixture.decisionEvent();
      await fixture.changeKeyboardShortcut(keyboardShortcut);

      await fixture.page.keyboard.press(keyboardShortcut);

      await expect(decisionEvent).resolves.toBeTruthy();
    });

    test("should emit the correct event for a skip decision", async ({ fixture }) => {
      await fixture.changeDecisionType("skip");

      const decisionEvent = fixture.decisionEvent();
      await fixture.decisionButton().click();

      await expect(decisionEvent).resolves.toBeTruthy();
    });

    test("should emit the correct event for a unsure decision", async ({ fixture }) => {
      await fixture.changeDecisionType("unsure");

      const decisionEvent = fixture.decisionEvent();
      await fixture.decisionButton().click();

      await expect(decisionEvent).resolves.toBeTruthy();
    });

    test("should be able to cancel a pointer decision with the escape key", async ({ fixture }) => {
      await logEvent(fixture.page, "decision");

      await fixture.decisionButton().dispatchEvent("pointerdown");
      await fixture.page.keyboard.press("Escape");
      await fixture.decisionButton().dispatchEvent("pointerup");

      await sleep(1);

      const events: unknown[] = await getEventLogs(fixture.page, "decision");
      expect(events).toHaveLength(0);
    });

    test("should be able to cancel a keyboard decision with the escape key", async ({ fixture }) => {
      const keyboardShortcut = "a";
      await logEvent(fixture.page, "decision");

      await fixture.changeKeyboardShortcut(keyboardShortcut);
      await fixture.page.dispatchEvent("html", "keydown", { key: keyboardShortcut });
      await fixture.page.keyboard.press("Escape");
      await fixture.page.dispatchEvent("html", "keyup", { key: keyboardShortcut });

      await sleep(1);

      const events: unknown[] = await getEventLogs(fixture.page, "decision");
      expect(events).toHaveLength(0);
    });

    test("should not emit an event if clicked when disabled", async ({ fixture }) => {
      await logEvent(fixture.page, "decision");

      await fixture.changeDecisionDisabled(true);
      // force = true bypasses accessibility checks. Because the button should
      // be disabled, it will fail accessability checked
      // however, we still want to test the event is not emitted, therefore
      // we use force = true to say "I know screen readers can't use this button
      // but test that the event is not emitted when clicked anyway"
      await fixture.decisionButton().click({ force: true });

      await sleep(1);

      const events: unknown[] = await getEventLogs(fixture.page, "decision");
      expect(events).toHaveLength(0);
    });

    test("should not be able to make a decision with keyboard shortcuts if disabled", async ({ fixture }) => {
      await logEvent(fixture.page, "decision");

      await fixture.changeDecisionDisabled(true);
      await fixture.page.keyboard.press("a");

      await sleep(1);

      const events: unknown[] = await getEventLogs(fixture.page, "decision");
      expect(events).toHaveLength(0);
    });
  });
});
