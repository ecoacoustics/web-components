import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { getBrowserValue } from "../../tests/helpers";
import { VerificationGridSettingsComponent } from "../verification-grid-settings/verification-grid-settings";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-verification-grid-settings");
  public fullscreenButton = () => this.page.locator("#fullscreen-button");
  public dismissHelpDialogButton = () => this.page.getByTestId("dismiss-help-dialog-btn").first();

  public async create() {
    await this.page.setContent(`
      <oe-verification-grid id="verification-grid" grid-size="0">
        <template>
          <oe-spectrogram></oe-spectrogram>
        </template>
      </oe-verification-grid>
    `);
    await this.page.waitForLoadState("networkidle");

    // because the help dialog is shown over all elements, we have to dismiss
    // it before we can interact with the settings component
    await this.dismissHelpDialogButton().click();

    await this.page.waitForSelector("oe-verification-grid");
    await this.page.waitForSelector("oe-verification-grid-settings");
  }

  public async isFullscreen(): Promise<boolean> {
    return (await getBrowserValue<VerificationGridSettingsComponent>(this.component(), "isFullscreen")) as boolean;
  }

  public async clickFullscreenButton(): Promise<void> {
    const fullscreenButton = this.fullscreenButton();
    await fullscreenButton.click();
  }
}

export const settingsFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
