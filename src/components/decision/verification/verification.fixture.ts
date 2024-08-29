import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { catchEvent, removeBrowserAttribute, setBrowserAttribute, setBrowserValue } from "../../../tests/helpers";
import { VerificationComponent } from "./verification";
import { SelectionObserverType } from "../../verification-grid/verification-grid";
import { DecisionOptions } from "../../../models/decisions/decision";
import { DecisionEvent } from "../decision";

class VerificationComponentFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-verification").first();
  public decisionButton = () => this.page.locator("#decision-button").first();
  public tagLegend = () => this.decisionButton().locator(".button-text").first();
  public additionalTagsLegend = () => this.decisionButton().locator(".additional-tags").first();
  public shortcutLegend = () => this.decisionButton().locator(".shortcut-legend").first();
  public colorPill = () => this.decisionButton().locator(".decision-color-pill").first();

  public async create() {
    await this.page.setContent(`<oe-verification verified="true"></oe-verification>`);
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector("oe-verification");
  }

  // events
  public decisionEvent() {
    // we cannot use use the static decisionEventName property from the Decision
    // class because the tests that use this fixture will stop being detected
    // when playwright looks for tests
    return catchEvent<DecisionEvent>(this.page, "decision");
  }

  // getters
  public async decisionTagText(): Promise<string | null> {
    return await this.tagLegend().textContent();
  }

  public async additionalTagsText(): Promise<string | null> {
    return await this.additionalTagsLegend().textContent();
  }

  public async shortcutText(): Promise<string | null> {
    return await this.shortcutLegend().textContent();
  }

  public async isShortcutLegendVisible(): Promise<boolean> {
    return (await this.shortcutLegend().count()) > 0;
  }

  // change attributes
  public async changeShortcut(key: string) {
    await setBrowserAttribute<VerificationComponent>(this.component(), "shortcut", key);
  }

  public async changeAdditionalTags(additionalTags: string) {
    // TODO: remove this type casting that is only needed because we are
    // checking properties instead of attributes in this helper
    await setBrowserAttribute<VerificationComponent>(
      this.component(),
      "additional-tags" as keyof VerificationComponent,
      additionalTags,
    );
  }

  public async changeSelectionMode(tabletSelection: SelectionObserverType) {
    await setBrowserValue<VerificationComponent>(this.component(), "selectionMode", tabletSelection);
  }

  public async changeVerified(verified: DecisionOptions) {
    await setBrowserAttribute<VerificationComponent>(this.component(), "verified", verified);
  }

  public async getPillColor(): Promise<string> {
    return await this.colorPill().evaluate((element: HTMLSpanElement) => {
      const styles = window.getComputedStyle(element);
      return styles.backgroundColor;
    });
  }

  public async changeDecisionDisabled(disabled: boolean) {
    const disabledAttributeName = "disabled" as const;

    if (!disabled) {
      await removeBrowserAttribute<VerificationComponent>(this.component(), disabledAttributeName);
      return;
    }

    await setBrowserAttribute<VerificationComponent>(this.component(), disabledAttributeName);
  }
}

export const verificationFixture = test.extend<{ fixture: VerificationComponentFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new VerificationComponentFixture(page);
    await run(fixture);
  },
});
