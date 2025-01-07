import { expect } from "@sand4rt/experimental-ct-web";
import { verificationFixture as test } from "./verification.fixture";
import { getCssBackgroundColorVariable, getEventLogs, logEvent } from "../../../tests/helpers";
import { DecisionOptions } from "../../../models/decisions/decision";

test.describe("Verification Component", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should display a shortcut tooltip on hover", async ({ fixture }) => {
    const decisionButton = fixture.decisionButton();
    await decisionButton.hover();
    const tooltip = await decisionButton.getAttribute("title");
    expect(tooltip).toBeTruthy();
  });

  test("should display a keyboard shortcut when provided", async ({ fixture }) => {
    const keyboardShortcut = "a";
    await fixture.changeShortcut(keyboardShortcut);

    const realizedKeyboardShortcut = await fixture.shortcutText();
    expect(realizedKeyboardShortcut).toEqual(keyboardShortcut);
  });

  test("should display both additional tags and a keyboard shortcut when provided", async ({ fixture }) => {
    const additionalTags = "tag1, tag2";
    const keyboardShortcut = "a";
    const expectedAdditionalTagsText = `(${additionalTags})`;

    await fixture.changeAdditionalTags(additionalTags);
    await fixture.changeShortcut(keyboardShortcut);

    const realizedAdditionalTags = await fixture.additionalTagsText();
    const realizedKeyboardShortcut = await fixture.shortcutText();

    expect(realizedAdditionalTags).toEqual(expectedAdditionalTagsText);
    expect(realizedKeyboardShortcut).toEqual(keyboardShortcut);
  });

  test("should have a spare space for additional tags even if not provided", async ({ fixture }) => {
    const realizedAdditionalTags = await fixture.additionalTagsText();
    expect(realizedAdditionalTags).toEqual("");
  });

  test("should have a spare space for a keyboard shortcut if none is provided", async ({ fixture }) => {
    const realizedKeyboardShortcut = await fixture.shortcutText();
    expect(realizedKeyboardShortcut).toEqual("");
  });

  test("should show keyboard shortcuts when in explicit desktop selection mode", async ({ fixture }) => {
    const testedKeyboardShortcut = "k";
    await fixture.changeShortcut(testedKeyboardShortcut);
    await fixture.changeIsMobile(false);

    const realizedKeyboardShortcut = await fixture.shortcutText();
    expect(realizedKeyboardShortcut).toBe(testedKeyboardShortcut);
  });

  test("should not show keyboard shortcuts when in tablet selection mode", async ({ fixture }) => {
    const testedKeyboardShortcut = "k";
    await fixture.changeShortcut(testedKeyboardShortcut);
    await fixture.changeIsMobile(true);

    const isShortcutVisible = await fixture.isShortcutLegendVisible();
    expect(isShortcutVisible).toBe(false);
  });

  test("should have the correct color for a true decision", async ({ fixture }) => {
    await fixture.changeVerified(DecisionOptions.TRUE);

    const expectedColor = await getCssBackgroundColorVariable(fixture.component(), "--verification-true");
    const realizedColor = await fixture.getPillColor();
    expect(realizedColor).toEqual(expectedColor);
  });

  test("should have the correct color for a false decision", async ({ fixture }) => {
    await fixture.changeVerified(DecisionOptions.FALSE);

    const expectedColor = await getCssBackgroundColorVariable(fixture.component(), "--verification-false");
    const realizedColor = await fixture.getPillColor();
    expect(realizedColor).toEqual(expectedColor);
  });

  test.describe("events", () => {
    const testedDecisionOptions = [
      DecisionOptions.FALSE,
      DecisionOptions.TRUE,
      DecisionOptions.SKIP,
      DecisionOptions.UNSURE,
    ];

    testedDecisionOptions.forEach((decisionOption) => {
      test(`should emit the correct event for a ${decisionOption} verification`, async ({ fixture }) => {
        await fixture.changeVerified(decisionOption);

        const decisionEvent = fixture.decisionEvent();
        await fixture.decisionButton().click();
        await expect(decisionEvent).resolves.toBeTruthy();
      });

      test(`should emit the correct event for a keyboard ${decisionOption} verification`, async ({ fixture, page }) => {
        const keyboardShortcut = "a";
        await fixture.changeShortcut(keyboardShortcut);
        await fixture.changeVerified(decisionOption);

        const decisionEvent = fixture.decisionEvent();
        await page.keyboard.press(keyboardShortcut);
        await expect(decisionEvent).resolves.toBeTruthy();
      });
    });

    test("should be able to cancel a pointer decision with the escape key", async ({ fixture, page }) => {
      await logEvent(page, "decision");

      await fixture.decisionButton().dispatchEvent("pointerdown");
      await page.keyboard.press("Escape");
      await fixture.decisionButton().dispatchEvent("pointerup");

      await page.waitForTimeout(1_000);

      const events: unknown[] = await getEventLogs(page, "decision");
      expect(events).toHaveLength(0);
    });

    test("should be able to cancel a keyboard decision with the escape key", async ({ fixture, page }) => {
      const keyboardShortcut = "a";
      await logEvent(page, "decision");

      await fixture.changeShortcut(keyboardShortcut);
      await page.dispatchEvent("html", "keydown", { key: keyboardShortcut });
      await page.keyboard.press("Escape");
      await page.dispatchEvent("html", "keyup", { key: keyboardShortcut });

      await page.waitForTimeout(1_000);

      const events: unknown[] = await getEventLogs(page, "decision");
      expect(events).toHaveLength(0);
    });

    test("should not emit an event if clicked when disabled", async ({ fixture, page }) => {
      await logEvent(page, "decision");

      await fixture.changeDecisionDisabled(true);
      // force = true bypasses accessibility checks. Because the button should
      // be disabled, it will fail accessability checked
      // however, we still want to test the event is not emitted, therefore
      // we use force = true to say "I know screen readers can't use this button
      // but test that the event is not emitted when clicked anyway"
      await fixture.decisionButton().click({ force: true });

      await page.waitForTimeout(1_000);

      const events: unknown[] = await getEventLogs(page, "decision");
      expect(events).toHaveLength(0);
    });

    test("should not be able to make a decision with keyboard shortcuts if disabled", async ({ fixture, page }) => {
      await logEvent(page, "decision");

      await fixture.changeDecisionDisabled(true);
      await page.keyboard.press("a");

      await page.waitForTimeout(1_000);

      const events: unknown[] = await getEventLogs(page, "decision");
      expect(events).toHaveLength(0);
    });
  });
});
