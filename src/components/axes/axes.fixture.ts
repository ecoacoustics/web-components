import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { AxesComponent } from "./axes";
import { getBrowserValue } from "../../tests/helpers";
import { Size } from "../../models/rendering";

class AxesFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-axes").first();
  public innerContent = () => this.page.getByTestId("inner-content");

  public async create() {
    await this.page.setContent(`
      <oe-axes>
          <div data-testid="inner-content"></div>
      </oe-axes>
    `);
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector("oe-axes");
  }

  public async indicatorSize(): Promise<Size> {
    const width = (await getBrowserValue<AxesComponent>(this.component(), "clientWidth")) as number;
    const height = (await getBrowserValue<AxesComponent>(this.component(), "clientHeight")) as number;
    return { width, height };
  }
}

export const axesFixture = test.extend<{ fixture: AxesFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new AxesFixture(page);
    await run(fixture);
  },
});
