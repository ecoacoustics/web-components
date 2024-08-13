import { Locator, Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import {
  getBrowserAttribute,
  getBrowserValue,
  invokeBrowserMethod,
  removeBrowserAttribute,
  setBrowserAttribute,
} from "../helpers";
import {
  VerificationGridComponent,
  VerificationGridSettings,
} from "../../components/verification-grid/verification-grid";
import { Size } from "../../models/rendering";
import {
  AxesComponent,
  DataSourceComponent,
  DecisionComponent,
  MediaControlsComponent,
  SpectrogramCanvasScale,
  VerificationGridTileComponent,
  VerificationHelpDialogComponent,
} from "../../components";
import { SubjectWrapper } from "../../models/subject";
import { Decision, DecisionId } from "../../models/decisions/decision";

class TestPage {
  public constructor(public readonly page: Page) {}

  public gridComponent = () => this.page.locator("oe-verification-grid").first();
  public dataSourceComponent = () => this.page.locator("oe-data-source").first();
  public mediaControlsComponent = () => this.page.locator("oe-media-controls").all();
  public gridTileComponents = () => this.page.locator("oe-verification-grid-tile").all();
  public indicatorComponents = () => this.page.locator("oe-indicator").all();
  public axesComponents = () => this.page.locator("oe-axes").all();
  public infoCardComponents = () => this.page.locator("oe-info-card").all();
  public decisionComponents = () => this.page.locator("oe-verification").all();

  public helpDialog = () => this.page.locator("oe-verification-help-dialog").first();
  public helpDialogContainer = () => this.page.locator("#help-dialog").first();
  public helpDialogPreference = () => this.page.locator("#dialog-preference").first();
  public helpDialogButton = () => this.page.getByTestId("help-dialog-button").first();
  public openHelpDialogButton = () => this.page.getByTestId("help-dialog-button").first();
  public dismissHelpDialogButton = () => this.page.getByTestId("dismiss-help-dialog-btn").first();

  public fileInputButton = () => this.page.locator(".file-input").first();
  public nextPageButton = () => this.page.getByTestId("next-page-button").first();
  public continueVerifyingButton = () => this.page.getByTestId("continue-verifying-button").first();
  public previousPageButton = () => this.page.getByTestId("previous-page-button").first();
  public downloadResultsButton = () => this.page.getByTestId("download-results-button").first();

  public gridTileContainers = () => this.page.locator(".tile-container").all();

  public indicatorLines = () => this.page.locator("oe-indicator #indicator-line").all();

  public testJsonInput = "http://localhost:3000/test-items.json";
  public secondJsonInput = "http://localhost:3000/test-items-2.json";

  public async create(customTemplate = "") {
    // disable pre-fetching so we don't wait for heaps of requests to finish
    await this.page.setContent(`
      <oe-verification-grid id="verification-grid" grid-size="3">
        <oe-verification verified="true" shortcut="Y">Koala</oe-verification>
        <oe-verification verified="false" shortcut="N">Not Koala</oe-verification>

        ${customTemplate}

        <oe-data-source
          slot="data-source"
          for="verification-grid"
          src="${this.testJsonInput}"
          local
        ></oe-data-source>
      </oe-verification-grid>
    `);
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector("oe-verification-grid");
  }

  // getters
  public async getGridSize(): Promise<number> {
    const gridTiles = await this.gridTileComponents();
    return gridTiles.length;
  }

  public async getPagedItems(): Promise<number> {
    const pagedItems = await getBrowserValue<VerificationGridComponent>(this.gridComponent(), "pagedItems");
    return pagedItems as number;
  }

  public async tileSizes(): Promise<Size[]> {
    const gridTiles = await this.gridTileComponents();

    const sizes: Size[] = [];

    for (const tile of gridTiles) {
      const styles: any = await getBrowserValue<VerificationGridTileComponent>(tile, "style");
      const width = styles.width;
      const height = styles.height;

      sizes.push({ width, height });
    }

    return sizes;
  }

  public async selectedTiles(): Promise<Locator[]> {
    const tiles = await this.gridTileComponents();
    const selectedTiles: Locator[] = [];

    for (const tile of tiles) {
      const isSelected = (await getBrowserValue<VerificationGridTileComponent>(tile, "selected")) as boolean;
      if (isSelected) {
        selectedTiles.push(tile);
      }
    }

    return selectedTiles;
  }

  public async getDecisionColor(index: number): Promise<number> {
    const decisionButton = (await this.decisionComponents())[index];
    const color = (await getBrowserValue<DecisionComponent>(decisionButton, "decisionId")) as DecisionId;
    return color;
  }

  public async availableDecision(): Promise<string[]> {
    const decisions = await this.decisionComponents();
    const values: string[] = [];

    for (const decision of decisions) {
      const value = (await decision.textContent()) ?? "";
      values.push(value.trim());
    }

    return values;
  }

  public async appliedDecisions(): Promise<Decision[]> {
    const tileModels = await this.verificationGridTileModels();
    return tileModels.flatMap((model) => model.decisionModels);
  }

  public async tileHighlightColors(): Promise<number[]> {
    const values: number[] = [];
    const tiles = await this.gridTileComponents();

    for (const tile of tiles) {
      const model = (await getBrowserValue<VerificationGridTileComponent>(tile, "model")) as SubjectWrapper;

      if (model.decisionModels) {
        const tileColors = model.decisionModels.map((tileModel) => tileModel.decisionId);
        values.push(...tileColors);
      }
    }

    return values;
  }

  public async buttonHighlightColors(): Promise<string[]> {
    return [];
  }

  public async highlightedTiles(): Promise<number[]> {
    const gridTiles = await this.gridTileComponents();

    const highlightedTiles: Locator[] = [];

    for (const tile of gridTiles) {
      const model = (await getBrowserValue<VerificationGridTileComponent>(tile, "model")) as SubjectWrapper;
      const isHighlighted = model.decisionModels && model.decisionModels.length > 0;
      if (isHighlighted) {
        highlightedTiles.push(tile);
      }
    }

    return highlightedTiles.map((_, i) => i);
  }

  public async highlightedButtons(): Promise<number[]> {
    const decisionComponents = await this.decisionComponents();

    const highlightedButtons: Locator[] = [];

    for (const button of decisionComponents) {
      const isHighlighted = await getBrowserValue<DecisionComponent>(button, "highlighted");
      if (isHighlighted) {
        highlightedButtons.push(button);
      }
    }

    return highlightedButtons.map((_, i) => i);
  }
  public async verificationGridTileModels(): Promise<SubjectWrapper[]> {
    const gridTiles = await this.gridTileComponents();

    const gridTileModels = gridTiles.map(async (tile) => {
      return (await getBrowserValue<VerificationGridTileComponent>(tile, "model")) as SubjectWrapper;
    });

    return await Promise.all(gridTileModels);
  }

  public async areMediaControlsPlaying(index: number): Promise<boolean> {
    const mediaControls: Locator = (await this.mediaControlsComponent())[index];
    const value = await invokeBrowserMethod<MediaControlsComponent>(mediaControls, "isSpectrogramPlaying");
    return value as boolean;
  }

  public async indicatorPosition(index: number): Promise<number> {
    const indicatorLine = (await this.indicatorLines())[index];

    return indicatorLine.evaluate((element: SVGLineElement) => {
      const styles = window.getComputedStyle(element);

      const domMatrixTranslateXKey: keyof DOMMatrix = "m41";
      const domMatrix = new DOMMatrix(styles.transform);
      return domMatrix[domMatrixTranslateXKey];
    });
  }

  public async isViewingHistory(): Promise<boolean> {
    const value = await invokeBrowserMethod<VerificationGridComponent>(this.gridComponent(), "isViewingHistory");
    return value as boolean;
  }

  public async downloadResults(): Promise<string> {
    const downloadButton = this.downloadResultsButton();
    return getBrowserAttribute(downloadButton, "href");
  }

  public async infoCardItem(index: number): Promise<{ key: unknown; value: unknown }[]> {
    const infoCard: Locator = (await this.infoCardComponents())[index];
    const subjectContent = infoCard.locator(".subject-content");

    return await subjectContent.evaluate((el) => {
      return Array.from(el.children).map((child) => {
        return {
          key: child.querySelector(".subject-key")?.textContent,
          value: child.querySelector(".subject-value")?.textContent,
        };
      });
    });
  }

  public async areAxesVisible(): Promise<boolean> {
    // we don't want to check each axes component individually because it is
    // slow and does not provide much benefit
    // therefore, we check if the first axes component is visible
    const axesComponents = await this.axesComponents();
    const axesComponentToTest = axesComponents[0];

    // when the axes component is hidden, all of its elements are hidden
    return await axesComponentToTest.evaluate((element: AxesComponent) => {
      return (
        element.showXTitle &&
        element.showYTitle &&
        element.showXAxis &&
        element.showYAxis &&
        element.showXGrid &&
        element.showYGrid
      );
    });
  }

  public async areMediaControlsVisible(): Promise<boolean> {
    // we don't use the mediaControls locator defined at the top of the fixture
    // because playwright will wait 30 seconds for it to appear and throw an
    // error if it can't find an element to match the selector
    return (await this.page.locator("oe-media-controls").count()) > 0;
  }

  public async isFullscreen(): Promise<boolean> {
    return await this.gridComponent().evaluate((element: VerificationGridComponent) => {
      return element.settings.isFullscreen.value;
    });
  }

  public async isHelpDialogOpen(): Promise<boolean> {
    return await this.helpDialog().evaluate((element: VerificationHelpDialogComponent) => element.open);
  }

  // actions
  public async nextPage() {
    await this.nextPageButton().click();
  }

  public async playSpectrogram(index: number) {
    const gridTiles = await this.gridTileComponents();
    const playButton = gridTiles[index].locator("[part='play-icon']").first();
    await playButton.click();
  }

  public async pauseSpectrogram(index: number) {
    const gridTiles = await this.gridTileComponents();
    const pauseButton = gridTiles[index].locator("[part='pause-icon']").first();
    await pauseButton.click();
  }

  public async openHelpDialog() {
    await this.openHelpDialogButton().click({ force: true });
  }

  public async dismissHelpDialog() {
    await this.dismissHelpDialogButton().click();
  }

  public async createSubSelection(items: number[], addToSelection = true) {
    const gridTiles = await this.gridTileContainers();
    const modifiers = addToSelection ? ["Control"] : [];

    for (const index of items) {
      await gridTiles[index].click({ position: { x: 0, y: 0 }, modifiers: modifiers as any });
    }
  }

  public async makeDecision(decision: number) {
    const decisionComponents = await this.decisionComponents();
    await decisionComponents[decision].click();
  }

  public async viewPreviousHistoryPage() {
    await this.previousPageButton().click();
  }

  public async viewNextHistoryPage() {
    await this.nextPageButton().click();
  }

  public async continueVerifying() {
    await this.continueVerifyingButton().click();
  }

  public async selectFile() {
    await this.fileInputButton().setInputFiles("file.json");
  }

  public async userDecisions(): Promise<SubjectWrapper[]> {
    return (await getBrowserValue<VerificationGridComponent>(
      this.gridComponent(),
      "subjectHistory",
    )) as SubjectWrapper[];
  }

  // change attributes
  public async changeGridSize(value: number) {
    await setBrowserAttribute<VerificationGridComponent>(this.gridComponent(), "grid-size" as any, value.toString());
  }

  public async changeGridSource(value: string) {
    await setBrowserAttribute<DataSourceComponent>(this.dataSourceComponent(), "src", value);
  }

  public async changeSourceLocal(local: boolean) {
    const targetedBrowserAttribute = "local";
    const strategy = local ? setBrowserAttribute : removeBrowserAttribute;
    strategy<DataSourceComponent>(this.dataSourceComponent(), targetedBrowserAttribute);
  }

  public async changeSpectrogramScaling(scale: SpectrogramCanvasScale) {
    console.log(scale);
  }

  public async showMediaControls(visible: boolean) {
    await this.changeGridSetting("showMediaControls", visible);
  }

  public async showAxes(visible: boolean) {
    await this.changeGridSetting("showAxes", visible);
  }

  public async toggleFullscreen(state: boolean) {
    await this.changeGridSetting("isFullscreen", state);
  }

  private async changeGridSetting(key: keyof VerificationGridSettings, value: boolean) {
    await this.gridComponent().evaluate(
      (element: VerificationGridComponent, { key, value }) => {
        element.settings[key].value = value;
      },
      { key, value },
    );
  }
}

export const verificationGridFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
