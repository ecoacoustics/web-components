import { Page } from "@playwright/test";
import { getBrowserStyle, waitForContentReady } from "../../tests/helpers";
import { expect } from "../../tests/assertions";
import { createFixture } from "../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-verification-grid-tile").first();
  public tileContainer = () => this.component().locator(".tile-container").first();

  public async create(content?: string) {
    // The verification grid exists in this test fixture so that we don't have
    // to mock the "settings" context.
    //
    // TODO: Figure out how to mock the settings context and remove the
    // verification grid component.
    const defaultContent = `
      <oe-verification-grid grid-size="1">
        <oe-verification-grid-tile></oe-verification-grid-tile>
      </oe-verification-grid>
    `;

    await this.page.setContent(content ?? defaultContent);
    await waitForContentReady(this.page, ["oe-verification-grid-tile"]);
  }

  public async assertCursor(expectedCursor: string) {
    // getBrowserStyles uses getComputedStyles and can therefore assert that the
    // correct cursor is applied, even if it comes from the user agent styles.
    const realizedCursor = await getBrowserStyle(this.tileContainer(), "cursor");
    expect(realizedCursor).toEqual(expectedCursor);
  }
}

export const verificationGridTileFixture = createFixture(TestPage);
