import { Page } from "@playwright/test";
import { getBrowserValue } from "../../tests/helpers";
import { VerificationGridTileComponent } from "./verification-grid-tile";
import { test } from "../../tests/assertions";

class VerificationGridTileFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-verification-grid-tile").first();
  public tileContainer = () => this.component().locator(".tile-container").first();

  public async create() {
    // because the grid tile component can't work without a spectrogram
    // it is reasonable to have a spectrogram and grid tile component in these
    // integration tests
    await this.page.setContent(`
      <oe-verification-grid-tile>
        <oe-spectrogram></oe-spectrogram>
      </oe-verification-grid-tile>
    `);
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector("oe-verification-grid-tile");
  }

  public async isSelected(): Promise<boolean> {
    const value = await getBrowserValue<VerificationGridTileComponent>(this.component(), "selected");
    return value as boolean;
  }

  // TODO: Fix this
  // public async getSelectionShortcut(): Promise<string> {
  //   return (
  //     ((await getBrowserValue<VerificationGridTileComponent>(this.component(), "shortcuts")) as string[]).at(-1) ?? ""
  //   );
  // }

  // public async getDecisionColor() {
  //   return await getBrowserValue<VerificationGridTileComponent>(this.component(), "color");
  // }

  // public async getTileStyles() {
  //   return await getBrowserStyles<HTMLDivElement>(this.tileContainer());
  // }

  // // actions
  // public async mouseSelectSpectrogramTile() {
  //   await this.tileContainer().click({ force: true });
  // }

  // public async keyboardSelectSpectrogramTile() {
  //   const keyboardShortcut = await this.getSelectionShortcut();
  //   await this.page.keyboard.press(keyboardShortcut);
  // }

  // public async setDecisionColor(value: string) {
  //   await setBrowserValue<VerificationGridTileComponent>(this.tileContainer(), "color", value);
  // }
}

export const verificationGridTileFixture = test.extend<{ fixture: VerificationGridTileFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new VerificationGridTileFixture(page);
    await run(fixture);
  },
});
