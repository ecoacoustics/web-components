import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { getBrowserValue, removeBrowserAttribute, setBrowserAttribute } from "../../tests/helpers";
import { DataSourceComponent } from "./data-source";

class DataSourceFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-data-source");
  public filePicker = () => this.page.locator(".file-picker").first();
  public localFileInputButton = () => this.page.locator(".file-input").first();
  public browserFileInput = () => this.page.locator(".browser-file-input").first();

  public async create() {
    await this.page.setContent(`<oe-data-source></oe-data-source>`);
    await this.page.waitForLoadState("networkidle");
  }

  public async setLocalAttribute(value: boolean) {
    if (value) {
      await setBrowserAttribute<DataSourceComponent>(this.component(), "local");
      return;
    }

    await removeBrowserAttribute<DataSourceComponent>(this.component(), "local");
  }

  public async setLocalFile() {}

  public async removeLocalFile() {}

  public async setRemoteFile(value: string) {
    await setBrowserAttribute<DataSourceComponent>(this.component(), "src", value);
  }

  public async removeRemoteFile() {
    await removeBrowserAttribute<DataSourceComponent>(this.component(), "src");
  }

  public async getFileName() {
    return await getBrowserValue<DataSourceComponent>(this.component(), "fileName");
  }

  public async getFileType() {
    return await getBrowserValue<DataSourceComponent>(this.component(), "fileType");
  }
}

export const dataSourceFixture = test.extend<{ fixture: DataSourceFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new DataSourceFixture(page);
    await run(fixture);
  },
});
