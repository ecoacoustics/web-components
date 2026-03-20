import { Page } from "@playwright/test";
import { waitForContentReady } from "../../tests/helpers/helpers";
import { expect } from "../../tests/assertions";
import { createFixture, setContent } from "../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public bootstrapModal = () => this.page.locator("oe-verification-bootstrap").first();
  public closeButton = () => this.page.getByTestId("dismiss-bootstrap-dialog-btn").first();
  public closeButtonIcon = () => this.closeButton().locator("sl-icon").first();

  public testJsonInput = "http://localhost:3000/test-items.json";

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

    // The bootstrap modal opens automatically on first load when the
    // auto-dismiss preference has not been set in localStorage.
    await expect(this.bootstrapModal()).toBeVisible();
  }
}

export const bootstrapModalFixture = createFixture(TestPage);
