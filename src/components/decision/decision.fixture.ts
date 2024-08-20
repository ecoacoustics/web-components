import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { catchEvent, getBrowserValue, removeBrowserAttribute, setBrowserAttribute } from "../../tests/helpers";
import { DecisionComponent } from "./decision";
import { SelectionObserverType } from "../verification-grid/verification-grid";

class DecisionFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-decision");
  public decisionButton = () => this.page.locator("#decision-button");
  public tagLegend = () => this.decisionButton().locator(".tag-text").first();
  public additionalTagsLegend = () => this.decisionButton().locator(".additional-tags").first();
  public shortcutLegend = () => this.decisionButton().locator(".keyboard-legend").first();

  public async create() {
    await this.page.setContent(`<oe-decision></oe-decision>`);
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector("oe-decision");
  }

  // events
  public decisionEvent() {
    // we cannot use use the static decisionEventName property from the Decision
    // class because the tests that use this fixture will stop being detected
    // when playwright looks for tests
    return catchEvent(this.page, "decision");
  }

  // change attributes
  public async changeDecisionShortcut(shortcut: string) {
    await setBrowserAttribute<DecisionComponent>(this.component(), "shortcut", shortcut);
  }

  public async changeDecisionAdditionalTags(additionalTags: string) {
    // TODO: remove this type casting that is only needed because we are
    // checking properties instead of attributes in this helper
    await setBrowserAttribute<DecisionComponent>(
      this.component(),
      "additional-tags" as keyof DecisionComponent,
      additionalTags,
    );
  }

  public async changeDecisionDisabled(disabled: boolean) {
    const disabledAttributeName = "disabled";

    if (!disabled) {
      await removeBrowserAttribute<DecisionComponent>(this.component(), disabledAttributeName);
      return;
    }

    await setBrowserAttribute<DecisionComponent>(this.component(), disabledAttributeName);
  }

  public async changeDecisionTabletSelection(tabletSelection: SelectionObserverType) {
    await setBrowserAttribute<DecisionComponent>(this.component(), "selectionMode", tabletSelection);
  }

  public async changeDecisionVerified(value: boolean) {
    await setBrowserAttribute<DecisionComponent>(this.component(), "verified", value.toString());
  }

  public async changeKeyboardShortcut(value: string) {
    await setBrowserAttribute<DecisionComponent>(this.component(), "shortcut", value);
  }

  public async changeDecisionType(value: string) {
    await setBrowserAttribute<DecisionComponent>(this.component(), "verified", value);
  }

  // get page properties
  public async isShowingDecisionColor(): Promise<boolean> {
    // TODO: this type casting is only needed because the return type of this
    // helper is incorrect
    return (await getBrowserValue<DecisionComponent>(this.component(), "highlighted")) as boolean;
  }

  public async decisionTagText(): Promise<string | null> {
    return await this.tagLegend().textContent();
  }

  public async additionalTagsText(): Promise<string | null> {
    return await this.additionalTagsLegend().textContent();
  }

  public async shortcutText(): Promise<string | null> {
    return await this.shortcutLegend().textContent();
  }
}

export const decisionFixture = test.extend<{ fixture: DecisionFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new DecisionFixture(page);
    await run(fixture);
  },
});
