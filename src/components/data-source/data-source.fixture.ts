import { Page } from "@playwright/test";
import {
  catchLocatorEvent,
  removeBrowserAttribute,
  setBrowserAttribute,
  waitForContentReady,
} from "../../tests/helpers";
import { DataSourceComponent } from "./data-source";
import { DownloadableResult, Subject } from "../../models/subject";
import { expect, test } from "../../tests/assertions";

class DataSourceFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-data-source");
  public localFileInputButton = () => this.page.locator(".file-input").first();
  public browserFileInput = () => this.page.locator("#browser-file-input").first();
  public decisionButtons = () => this.page.locator(".decision-button").all();

  public verificationGrid = () => this.page.locator("oe-verification-grid").first();
  public gridTiles = () => this.page.locator(".tile-container").all();
  public dismissBootstrapDialogButton = () => this.page.getByTestId("dismiss-bootstrap-dialog-btn").first();

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

    await waitForContentReady(this.page, [
      "oe-verification-grid",
      "oe-data-source",
      "oe-verification",
      "oe-verification-grid-tile",
    ]);

    // By having an except statement here, playwright will continue running this
    // assertion until it passes or the test times out (30 seconds).
    // We do this so that we know the entire grid has loaded.
    await expect(this.verificationGrid()).toHaveJSProperty("loaded", true);
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
    const loadedEvent = catchLocatorEvent(this.verificationGrid(), "grid-loaded");
    await setBrowserAttribute<DataSourceComponent>(this.component(), "src", value);
    await loadedEvent;
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
    return (await this.component().evaluate((element: DataSourceComponent) =>
      element.urlSourcedFetcher?.generateSubjects(),
    )) as ReadonlyArray<Subject>;
  }

  public async getDownloadResults(): Promise<ReadonlyArray<Partial<DownloadableResult>>> {
    return await this.component().evaluate((element: DataSourceComponent) => element["resultRows"]());
  }

  public async makeSubSelection(subSelectionIndices: number[]) {
    const gridTiles = await this.gridTiles();
    for (const index of subSelectionIndices) {
      await gridTiles[index].click();
    }
  }

  public async dismissBootstrapDialog() {
    await this.dismissBootstrapDialogButton().click();
  }

  public async sendDecision(decisionIndex: number) {
    // Because decisions are handled by the verification grid after a click
    // event, awaiting the button click does not ensure that all event listeners
    // have completed.
    // Therefore, we have to wait for the "decisionMade" event to ensure that
    // the click event was handled by the verification grid component.
    const decisionEvent = catchLocatorEvent(this.verificationGrid(), "decision-made");

    const decisionButtons = await this.decisionButtons();
    await decisionButtons[decisionIndex].click();

    await decisionEvent;
  }
}

export const dataSourceFixture = test.extend<{ fixture: DataSourceFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new DataSourceFixture(page);
    await run(fixture);
  },
});
