import { Page } from "@playwright/test";
import { waitForContentReady } from "../../tests/helpers/helpers";
import { createFixture, setContent } from "../../tests/fixtures";
import { VerificationBootstrapComponent } from "./bootstrap-modal";

class TestPage {
  public constructor(public readonly page: Page) {}

  public bootstrapModal = () => this.page.locator("oe-verification-bootstrap").first();
  public closeButton = () => this.page.getByTestId("dismiss-bootstrap-dialog-btn").first();
  public closeButtonIcon = () => this.closeButton().locator("sl-icon").first();

  public testJsonInput = "http://localhost:3000/test-items.json";

  /**
   * Returns true when the bootstrap modal dialog is open.
   *
   * Note: `toBeVisible()` cannot be used on the `oe-verification-bootstrap`
   * host element directly because the host has no visible dimensions — the
   * modal is rendered as a fixed-position `<dialog>` inside the shadow root.
   * Instead we read the component's `open` JS property.
   */
  public async isOpen(): Promise<boolean> {
    return await this.bootstrapModal().evaluate((element: VerificationBootstrapComponent) => element.open);
  }

  public async create() {
    await setContent(
      this.page,
      `
      <oe-verification-grid id="verification-grid" grid-size="1">
        <oe-data-source
          slot="data-source"
          for="verification-grid"
          src="${this.testJsonInput}"
        ></oe-data-source>
      </oe-verification-grid>
    `,
    );

    await waitForContentReady(this.page, ["oe-verification-grid"]);
  }
}

export const bootstrapModalFixture = createFixture(TestPage);
