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
  public downloadResultsButton = () => this.page.getByTestId("download-results-button").first();
  public localFileInputButton = () => this.page.locator(".file-input").first();
  public browserFileInput = () => this.page.locator("#browser-file-input").first();

  // A locator for the download buttons default slot.
  // This can be used to assert that the slot has the correct default value and
  // can accept other content such as images.
  public downloadResultsPrompt = () => this.page.getByTestId("download-results-button").locator("slot").first();

  public verificationGrid = () => this.page.locator("oe-verification-grid").first();
  public gridTiles = () => this.page.locator(".tile-container").all();
  public dismissBootstrapDialogButton = () => this.page.getByTestId("dismiss-bootstrap-dialog-btn").first();

  public testJsonInput = "http://localhost:3000/test-items.json";

  public async create() {
    await this.page.setContent(`
      <oe-verification-grid id="verification-grid" grid-size="3">
        <oe-verification verified="true">Koala</oe-verification>
        <oe-verification verified="false">Not Koala</oe-verification>
        <oe-verification data-testid="additional-tags" verified="true" additional-tags="frog">
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
      "oe-verification-grid-tile",
      ".decision-button",
    ]);

    // Because we assert a JS browser property, playwright will re-run this
    // assertion until it passes or the test times out (30 seconds).
    // We do this so that the test will continue waiting here util the
    // assertion passes, indicating that the verification grid has loaded.
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

  // TODO: The signature of this function can be greatly improved
  public async sendDecision(decision: "true" | "false" | "skip" | "additional-tags") {
    // Because decisions are handled by the verification grid after a click
    // event, awaiting the button click does not ensure that all event listeners
    // have completed.
    // Therefore, we have to wait for the "decisionMade" event to ensure that
    // the click event was handled by the verification grid component.
    const decisionEvent = catchLocatorEvent(this.verificationGrid(), "decision-made");

    const matchingComponents =
      decision === "additional-tags"
        ? this.page.getByTestId("additional-tags")
        : this.page.locator(`oe-verification[verified="${decision}"]`);
    const decisionComponent = matchingComponents.first();

    const decisionButton = decisionComponent.locator("#decision-button");
    await decisionButton.click();

    await decisionEvent;
  }
}

export const dataSourceFixture = test.extend<{ fixture: DataSourceFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new DataSourceFixture(page);
    await run(fixture);
  },
});
