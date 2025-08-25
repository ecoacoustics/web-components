import { expect } from "../../../tests/assertions";
import { verificationFixture as test } from "./verification.fixture";
import { getCssVariableStyle, getEventLogs, logEvent } from "../../../tests/helpers";
import { DecisionOptions } from "../../../models/decisions/decision";
import { sleep } from "../../../helpers/utilities";
import { CssVariable } from "../../../helpers/types/advancedTypes";

test.describe("Verification Component", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should display a keyboard shortcut when provided", async ({ fixture }) => {
    await fixture.changeShortcut("a");
    await expect(fixture.shortcutLegend()).toHaveTrimmedText("A");
  });

  test("should display both additional tags and a keyboard shortcut when provided", async ({ fixture }) => {
    const additionalTags = "tag1, tag2";
    const keyboardShortcut = "a";
    const expectedAdditionalTags = ["tag1", "tag2"];

    await fixture.changeAdditionalTags(additionalTags);
    await fixture.changeShortcut(keyboardShortcut);

    const realizedAdditionalTags = fixture.additionalTags();
    for (let i = 0; i < expectedAdditionalTags.length; i++) {
      await expect(realizedAdditionalTags.nth(i)).toHaveText(expectedAdditionalTags[i]);
    }

    await expect(fixture.shortcutLegend()).toHaveTrimmedText("A");
  });

  test("should have a spare space for a keyboard shortcut if none is provided", async ({ fixture }) => {
    await expect(fixture.shortcutLegend()).toHaveTrimmedText("");
  });

  test("should show keyboard shortcuts when in explicit desktop selection mode", async ({ fixture }) => {
    await fixture.changeShortcut("k");
    await fixture.changeIsMobile(false);
    await expect(fixture.shortcutLegend()).toHaveTrimmedText("K");
  });

  test("should not show keyboard shortcuts when in tablet selection mode", async ({ fixture }) => {
    const testedKeyboardShortcut = "k";
    await fixture.changeShortcut(testedKeyboardShortcut);
    await fixture.changeIsMobile(true);

    await expect(fixture.shortcutLegend()).toHaveTrimmedText("");
  });

  test.describe("decision colors", () => {
    interface DecisionColorTest {
      decision: DecisionOptions;
      expectedColor: CssVariable;
    }

    const decisionColorTests: DecisionColorTest[] = [
      { decision: DecisionOptions.TRUE, expectedColor: "--oe-verification-true" },
      { decision: DecisionOptions.FALSE, expectedColor: "--oe-verification-false" },
      { decision: DecisionOptions.UNSURE, expectedColor: "--oe-verification-unsure" },
      { decision: DecisionOptions.SKIP, expectedColor: "--oe-decision-skip-color" },
    ];

    decisionColorTests.forEach((testCase) => {
      test(`should have the correct color for a ${testCase.decision} decision`, async ({ fixture }) => {
        await fixture.changeVerified(testCase.decision);

        const expectedColor = await getCssVariableStyle(fixture.colorPill(), testCase.expectedColor, "background");
        await expect(fixture.colorPill()).toHaveCSS("background", expectedColor);
      });
    });
  });

  test.describe("events", () => {
    const testedDecisionOptions: DecisionOptions[] = [
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

      test(`should emit the correct event for a keyboard ${decisionOption} verification`, async ({ fixture }) => {
        const keyboardShortcut = "a";
        await fixture.changeShortcut(keyboardShortcut);
        await fixture.changeVerified(decisionOption);

        const decisionEvent = fixture.decisionEvent();
        await fixture.page.keyboard.press(keyboardShortcut);
        await expect(decisionEvent).resolves.toBeTruthy();
      });
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

      await fixture.changeShortcut(keyboardShortcut);
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
      //
      // eslint-disable-next-line playwright/no-force-option
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
