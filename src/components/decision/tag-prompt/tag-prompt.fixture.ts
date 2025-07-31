import { Page } from "@playwright/test";
import { createFixture, setContent } from "../../../tests/fixtures";
import { waitForContentReady } from "../../../tests/helpers";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-tag-prompt").first();
  public shortcutLegend = () => this.page.locator(".shortcut-legend").first();
  public decisionColorPill = () => this.page.locator(".decision-color-pill").first();

  public decisionButton = () => this.page.locator("#decision-button").first();
  public buttonText = () => this.page.locator(".button-text").first();

  public typeaheadInput = () => this.page.locator("#typeahead-input").first();

  public async create() {
    await setContent(this.page, `<oe-tag-prompt></oe-tag-prompt>`);
    await waitForContentReady(this.page, [".decision-button"]);
  }

  public async getPillColor(): Promise<string> {
    return await this.decisionColorPill().evaluate((element: HTMLSpanElement) => {
      const styles = window.getComputedStyle(element);
      return styles.background;
    });
  }
}

export const tagPromptFixture = createFixture(TestPage);
