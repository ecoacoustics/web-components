import { Page } from "@playwright/test";
import {
  catchEvent,
  removeBrowserAttribute,
  setBrowserAttribute,
  setBrowserValue,
  waitForContentReady,
} from "../../../tests/helpers";
import { VerificationComponent } from "./verification";
import { DecisionOptions } from "../../../models/decisions/decision";
import { DecisionEvent } from "../decision";
import { test } from "../../../tests/assertions";

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
    await waitForContentReady(this.page, ["oe-verification"]);

    // mock the verification grid by binding it to the document object
    // this means that we can test that the shortcut keys work correctly without
    // having to create the entire verification grid
    // shortcut keys + integration testing is tested in the verification grid
    // e2e tests
    await this.component().evaluate((element: VerificationComponent) => {
      element.verificationGrid = document as any;
    });
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

  public async changeIsMobile(tabletSelection: boolean) {
    await setBrowserValue<VerificationComponent>(this.component(), "isMobile", tabletSelection);
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
    const disabledAttributeName = "disabled";

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
