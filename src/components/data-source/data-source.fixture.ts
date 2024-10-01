import { Page } from "@playwright/test";
import { invokeBrowserMethod, removeBrowserAttribute, setBrowserAttribute } from "../../tests/helpers";
import { DataSourceComponent } from "./data-source";
import { Subject } from "../../models/subject";
import { test } from "../../tests/assertions";

class DataSourceFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-data-source");
  public filePicker = () => this.page.locator(".file-picker").first();
  public localFileInputButton = () => this.page.locator(".file-input").first();
  public browserFileInput = () => this.page.locator("#browser-file-input").first();
  public decisionButtons = () => this.page.locator(".decision-button").all();
  public gridTiles = () => this.page.locator(".tile-container").all();
  public dismissHelpDialogButton = () => this.page.getByTestId("dismiss-help-dialog-btn").first();

  public testJsonInput = "http://localhost:3000/test-items.json";

  public async create() {
    await this.page.setContent(`
      <oe-verification-grid id="verification-grid" grid-size="3" pre-fetch="false">
        <template>
            <oe-spectrogram></oe-spectrogram>
        </template>

        <oe-decision verified="true" tag="koala">Koala</oe-decision>
        <oe-decision verified="false" tag="koala">Not Koala</oe-decision>
        <oe-decision verified="false" tag="koala" additional-tags="frog">
          Additional Tags
        </oe-decision>

        <oe-data-source
          slot="data-source"
          for="verification-grid"
          src="${this.testJsonInput}"
          local
        ></oe-data-source>
      </oe-verification-grid>
    `);
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector("oe-data-source");
    await this.page.waitForSelector("oe-verification-grid");
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

  public async getFileName(): Promise<string> {
    return await this.component().evaluate((element: DataSourceComponent) => element.dataFetcher?.file?.name ?? "");
  }

  public async getMediaType(): Promise<string> {
    return await this.component().evaluate((element: DataSourceComponent) => element.dataFetcher?.mediaType ?? "");
  }

  public async getFileContent(): Promise<ReadonlyArray<Subject>> {
    return (await invokeBrowserMethod<DataSourceComponent>(this.component(), "resultRows")) as ReadonlyArray<Subject>;
  }

  public async makeSubSelection(subSelectionIndicies: number[]): Promise<void> {
    const gridTiles = await this.gridTiles();
    for (const index of subSelectionIndicies) {
      await gridTiles[index].click({ force: true });
    }
  }

  public async makeDecisions(decisionButtonIndicies: number[]): Promise<void> {
    const decisionButtons = await this.decisionButtons();
    for (const index of decisionButtonIndicies) {
      await decisionButtons[index].click();
    }
  }

  public async dismissHelpDialog(): Promise<void> {
    await this.dismissHelpDialogButton().click();
  }
}

export const dataSourceFixture = test.extend<{ fixture: DataSourceFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new DataSourceFixture(page);
    await run(fixture);
  },
});
