import { expect } from "../../../tests/assertions";
import { getEventLogs, logEvent } from "../../../tests/helpers";
import { classificationFixture as test } from "./classification.fixture";

test.describe("Classification Component", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should display the correct shortcuts if both true and false shortcuts are provided", async ({ fixture }) => {
    const trueShortcut = "a";
    const falseShortcut = "b";

    await fixture.changeTrueShortcut(trueShortcut);
    await fixture.changeFalseShortcut(falseShortcut);

    const realizedShortcuts = await fixture.getShortcutLegends();

    // we expect that the shortcut keys are displayed in uppercase
    expect(realizedShortcuts).toEqual(["A", "B"]);
  });

  test("should derive a false shortcut if only a true shortcut is provided", async ({ fixture }) => {
    const trueShortcut = "a";

    await fixture.changeTrueShortcut(trueShortcut);

    const realizedShortcuts = await fixture.getShortcutLegends();
    expect(realizedShortcuts).toEqual(["A", "⇧A"]);
  });

  test("should derive a true shortcut if only a false shortcut is provided", async ({ fixture }) => {
    const falseShortcut = "J";
    const expectedDisplayedShortcuts = ["J", "⇧J"];

    await fixture.changeFalseShortcut(falseShortcut);

    const realizedShortcuts = await fixture.getShortcutLegends();
    expect(realizedShortcuts).toEqual(expectedDisplayedShortcuts);
  });

  test("should use a lowercase letter for false if the true shortcut is uppercase", async ({ fixture }) => {
    const trueShortcut = "A";

    await fixture.changeTrueShortcut(trueShortcut);

    const realizedShortcuts = await fixture.getShortcutLegends();
    expect(realizedShortcuts).toEqual(["⇧A", "A"]);
  });

  test("should use an uppercase letter for true if the false shortcut is lowercase", async ({ fixture }) => {
    const falseShortcut = "j";

    await fixture.changeFalseShortcut(falseShortcut);

    const realizedShortcuts = await fixture.getShortcutLegends();
    expect(realizedShortcuts).toEqual(["⇧J", "J"]);
  });

  test("should not have any shortcuts if none are provided", async ({ fixture }) => {
    const realizedShortcuts = await fixture.shortcutLegends();
    expect(realizedShortcuts).toHaveLength(0);
  });

  test("should have both true and false buttons from a single classification component", async ({ fixture }) => {
    const expectedText = ["true", "false"];
    const realizedText = await fixture.getDecisionOptions();
    expect(realizedText).toEqual(expectedText);
  });

  test("should display the correct tag text above the decision button", async ({ fixture }) => {
    const tag = "jellyfish";
    const expectedTagText = tag;
    await fixture.changeTag(tag);

    const decisionTitle = fixture.decisionTitle();
    await expect(decisionTitle).toHaveTrimmedText(expectedTagText);
  });

  test.describe("events", () => {
    test("should emit the correct event when the true button is clicked", async ({ fixture }) => {
      const decisionEvent = fixture.decisionEvent();
      await fixture.decisionTrueButton().click();
      await expect(decisionEvent).resolves.toBeTruthy();
    });

    test("should emit the correct event when the false button is clicked", async ({ fixture }) => {
      const decisionEvent = fixture.decisionEvent();
      await fixture.decisionFalseButton().click();
      await expect(decisionEvent).resolves.toBeTruthy();
    });

    test("should be able to cancel a pointer decision with the escape key", async ({ fixture, page }) => {
      await logEvent(page, "decision");

      await fixture.decisionTrueButton().dispatchEvent("pointerdown");
      await page.keyboard.press("Escape");
      await fixture.decisionTrueButton().dispatchEvent("pointerup");

      await page.waitForTimeout(1_000);

      const events: unknown[] = await getEventLogs(page, "decision");
      expect(events).toHaveLength(0);
    });

    test("should emit the correct event if a decision is changed", async ({ fixture }) => {
      await fixture.makeFalseDecision();

      const decisionEvent = fixture.decisionEvent();
      await fixture.makeTrueDecision();

      await expect(decisionEvent).resolves.toBeTruthy();
    });

    test("should not emit an event if clicked when disabled", async ({ fixture, page }) => {
      await logEvent(page, "decision");

      await fixture.changeDecisionDisabled(true);
      // force = true bypasses accessibility checks. Because the button should
      // be disabled, it will fail accessability checked
      // however, we still want to test the event is not emitted, therefore
      // we use force = true to say "I know screen readers can't use this button
      // but test that the event is not emitted when clicked anyway"
      await fixture.decisionTrueButton().click({ force: true });
      await page.waitForTimeout(1_000);

      const events: unknown[] = await getEventLogs(page, "decision");
      expect(events).toHaveLength(0);
    });

    test("should emit an event when clicked if a decision is re-enabled after being disabled", async ({
      fixture,
      page,
    }) => {
      const loggedEventName = "decision";
      await logEvent(page, loggedEventName);
      await fixture.changeDecisionDisabled(true);
      await fixture.changeDecisionDisabled(false);

      await fixture.decisionTrueButton().click();
      await page.waitForTimeout(1_000);

      const events: unknown[] = await getEventLogs(page, loggedEventName);
      expect(events).toHaveLength(1);
    });
  });
});
