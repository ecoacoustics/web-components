import { Page } from "@playwright/test";
import { removeBrowserAttribute, setBrowserAttribute } from "../../tests/helpers";
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

  public decisions = {
    positive: 0,
    negative: 1,
    additionalTags: 2,
  } as const;

  public async create() {
    await this.page.setContent(`
      <oe-verification-grid id="verification-grid" grid-size="3">
        <oe-verification verified="true">Koala</oe-verification>
        <oe-verification verified="false">Not Koala</oe-verification>
        <oe-verification verified="true" additional-tags="frog">
          Additional Tags
        </oe-verification>

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
    return await this.component().evaluate(
      (element: DataSourceComponent) => element.urlSourcedFetcher?.file?.name ?? "",
    );
  }

  public async getMediaType(): Promise<string> {
    return await this.component().evaluate(
      (element: DataSourceComponent) => element.urlSourcedFetcher?.mediaType ?? "",
    );
  }

  public async getFileContent(): Promise<ReadonlyArray<Subject>> {
    return (await this.component().evaluate(
      (element: DataSourceComponent) => element.urlSourcedFetcher?.subjects() ?? [],
    )) as ReadonlyArray<Subject>;
  }

  public async getDownloadResults(): Promise<ReadonlyArray<Subject>> {
    return await this.component().evaluate((element: DataSourceComponent) => element["urlSourcedResultRows"]());
  }

  public async makeSubSelection(subSelectionIndicies: number[]): Promise<void> {
    const gridTiles = await this.gridTiles();
    for (const index of subSelectionIndicies) {
      await gridTiles[index].click({ force: true });
    }
  }

  public async dismissHelpDialog(): Promise<void> {
    await this.dismissHelpDialogButton().click();
  }

  public async sendDecision(decisionIndex: number): Promise<void> {
    const decisionButtons = await this.decisionButtons();
    await decisionButtons[decisionIndex].click();
  }
}

export const dataSourceFixture = test.extend<{ fixture: DataSourceFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new DataSourceFixture(page);
    await run(fixture);
  },
});
