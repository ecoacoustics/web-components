import { Locator, Page } from "@playwright/test";
import {
  catchLocatorEvent,
  dragSelection,
  dragSlider,
  getBrowserAttribute,
  getBrowserSignalValue,
  getBrowserValue,
  getCssBackgroundColorVariable,
  invokeBrowserMethod,
  removeBrowserAttribute,
  setBrowserAttribute,
  waitForContentReady,
} from "../helpers";
import {
  MousePosition,
  SelectionObserverType,
  VerificationGridComponent,
  VerificationGridSettings,
} from "../../components/verification-grid/verification-grid";
import { Size } from "../../models/rendering";
import { GridShape } from "../../helpers/controllers/dynamic-grid-sizes";
import {
  AxesComponent,
  DataSourceComponent,
  MediaControlsComponent,
  ProgressBar,
  SpectrogramCanvasScale,
  SpectrogramComponent,
  VerificationBootstrapComponent,
  VerificationGridTileComponent,
} from "../../components";
import { SubjectWrapper } from "../../models/subject";
import { Decision } from "../../models/decisions/decision";
import { expect, test } from "../assertions";
import { KeyboardModifiers } from "../../helpers/types/playwright";
import { decisionColor } from "../../services/colors";
import { CssVariable } from "../../helpers/types/advancedTypes";
import { SlTooltip } from "@shoelace-style/shoelace";
import { SPACE_KEY } from "../../helpers/keyboard";

class TestPage {
  public constructor(public readonly page: Page) {}

  public hostAppInput = () => this.page.getByTestId("host-app-input").first();

  public gridComponent = () => this.page.locator("oe-verification-grid").first();
  public gridContainer = () => this.page.locator("#grid-container").first();
  public dataSourceComponent = () => this.page.locator("oe-data-source").first();
  public gridTileComponents = () => this.page.locator("oe-verification-grid-tile").all();
  public indicatorComponents = () => this.page.locator("oe-indicator").all();
  public axesComponents = () => this.page.locator("oe-axes").all();
  public infoCardComponents = () => this.page.locator("oe-info-card").all();
  public skipDecisionButton = () => this.page.locator("#skip-button").first();

  public bootstrapDialog = () => this.page.locator("oe-verification-bootstrap").first();
  public bootstrapSlideTitleElement = () => this.page.locator(".slide-title").first();
  public bootstrapDialogButton = () => this.page.getByTestId("help-dialog-button").first();
  public dismissBootstrapDialogButton = () => this.page.getByTestId("dismiss-bootstrap-dialog-btn").first();

  public verificationDecisions = () => this.page.locator("oe-verification").all();
  public classificationDecisions = () => this.page.locator("oe-classification").all();
  public decisionButtons = () => this.page.locator(".decision-button").all();
  public decisionButtonsText = () => this.page.locator(".button-text").all();
  public decisionColorPills = () => this.page.locator(".decision-color-pill").all();

  public fileInputButton = () => this.page.locator(".file-input").first();
  public nextPageButton = () => this.page.getByTestId("next-page-button").first();
  public continueVerifyingButton = () => this.page.getByTestId("continue-verifying-button").first();
  public previousPageButton = () => this.page.getByTestId("previous-page-button").first();
  public downloadResultsButton = () => this.page.getByTestId("download-results-button").first();

  public gridTileContainers = () => this.page.locator(".tile-container").all();
  public gridTileProgressMeters = () => this.page.locator(".progress-meter").all();
  public gridTileProgressMeterSegments = async (index = 0) =>
    (await this.gridTileProgressMeters())[index].locator(".progress-meter-segment").all();
  public gridTileProgressMeterTooltips = async (index = 0) =>
    (await this.gridTileProgressMeters())[index].locator("sl-tooltip").all();

  public gridProgressBar = () => this.page.locator("oe-progress-bar").first();
  public gridProgressBarCompletedTooltip = () => this.gridProgressBar().getByTestId("completed-tooltip").first();
  public gridProgressBarViewHeadTooltip = () => this.gridProgressBar().getByTestId("view-head-tooltip").first();
  public gridProgressCompletedSegment = () => this.gridProgressBar().locator(".completed-segment").first();
  public gridProgressHeadSegment = () => this.gridProgressBar().locator(".head-segment").first();

  public spectrogramComponents = () => this.page.locator("oe-spectrogram").all();
  public spectrogramComponent = async (index = 0) =>
    (await this.gridTileComponents())[index].locator("oe-spectrogram").first();
  public gridTileComponent = async (index = 0) => (await this.gridTileComponents())[index].first();
  public audioElement = async (index = 0) => (await this.spectrogramComponent(index)).locator("audio").first();

  public mediaControlsComponent = async (index = 0) =>
    (await this.gridTileContainers())[index].locator("oe-media-controls").first();
  public mediaControlsAdditionalSettings = async (index = 0) =>
    (await this.mediaControlsComponent(index)).locator(".settings-menu-item").first();
  public brightnessControlsMenu = async (index = 0) =>
    (await this.gridTileContainers())[index].getByText("Brightness").first();
  public brightnessControlsInput = async (index = 0) =>
    (await this.gridTileContainers())[index].locator("input").first();

  public indicatorLines = () => this.page.locator("oe-indicator #indicator-line").all();

  public testJsonInput = "http://localhost:3000/test-items.json";
  public secondJsonInput = "http://localhost:3000/test-items-2.json";
  private defaultTemplate = `
    <oe-verification verified="true" shortcut="Y"></oe-verification>
    <oe-verification verified="false" shortcut="N"></oe-verification>
  `;

  public async create(customTemplate = this.defaultTemplate) {
    await this.page.setContent(`
      <oe-verification-grid id="verification-grid">
        ${customTemplate}

        <oe-data-source
          slot="data-source"
          for="verification-grid"
          src="${this.testJsonInput}"
        ></oe-data-source>
      </oe-verification-grid>
    `);

    await waitForContentReady(this.page, ["oe-verification-grid", "oe-data-source", "oe-verification"]);
  }

  public async createWithClassificationTask() {
    await this.create(`
      <oe-classification tag="car" true-shortcut="h"></oe-classification>
      <oe-classification tag="koala" true-shortcut="j"></oe-classification>
      <oe-classification tag="bird" true-shortcut="k"></oe-classification>
    `);
  }

  public async createWithVerificationTask() {
    await this.create(`
      <oe-verification verified="true"></oe-verification>
      <oe-verification verified="false"></oe-verification>
    `);
  }

  public async createWithAppChrome() {
    // this test fixture has an app chrome with a header so that the grid is not
    // flush with the top of the page
    // this allows us to test how the verification grid interacts with scrolling
    await this.page.setContent(`
      <header>
        <h1>Host Application</h1>
      </header>

      <div id="host-application-wrapper">
        <oe-verification-grid id="verification-grid">
          ${this.defaultTemplate}

          <oe-data-source
            slot="data-source"
            for="verification-grid"
            src="${this.testJsonInput}"
          ></oe-data-source>
        </oe-verification-grid>
      </div>

      <div>
        <p>This is some content from the host application</p>

        <p>
          If you use this input box, you shouldn't trigger any key events on the
          verification grid.
        </p>

        <input data-testid="host-app-input" type="text" />
      </div>
    `);
  }

  // getters
  public async decisionComponents(): Promise<Locator[]> {
    const verificationDecisions = await this.verificationDecisions();
    const classificationDecisions = await this.classificationDecisions();
    return [...verificationDecisions, ...classificationDecisions];
  }

  public async panelColor(): Promise<string> {
    // I have hard coded the panel color here because we use HSL for the panel
    // color css variable, but DOM queries and assertions use RGB
    return await getCssBackgroundColorVariable(this.gridComponent(), "--oe-panel-color");
  }

  public async getGridSize(): Promise<number> {
    const gridTiles = await this.gridTileComponents();
    return gridTiles.length;
  }

  public async getViewHead(): Promise<number> {
    const pagedItems = await getBrowserValue<VerificationGridComponent>(this.gridComponent(), "viewHead");
    return pagedItems as number;
  }

  public async getVerificationHead(): Promise<number> {
    const pagedItems = await getBrowserValue<VerificationGridComponent>(this.gridComponent(), "decisionHead");
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

  public async selectedTileIndexes(): Promise<number[]> {
    const tiles = await this.gridTileComponents();
    const indexes: number[] = [];

    for (const tile of tiles) {
      const isSelected = (await getBrowserValue<VerificationGridTileComponent>(tile, "selected")) as boolean;
      if (isSelected) {
        const tileIndex = (await getBrowserValue<VerificationGridTileComponent>(tile, "index")) as number;
        indexes.push(tileIndex);
      }
    }

    return indexes;
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

  public async getDecisionColor(index: number): Promise<string> {
    const targets = await this.decisionColorPills();
    const target = targets[index];

    return await target.evaluate((element: HTMLSpanElement) => {
      const styles = window.getComputedStyle(element);
      return styles.backgroundColor;
    });
  }

  public async availableDecision(): Promise<string[]> {
    const decisions = await this.decisionButtonsText();
    const values: string[] = [];

    for (const decision of decisions) {
      const value = (await decision.textContent()) ?? "";
      values.push(value.trim());
    }

    return values;
  }

  public async allAppliedDecisions(): Promise<Decision[]> {
    const result: Decision[] = [];

    const gridTiles = await this.gridTileComponents();
    for (let i = 0; i < gridTiles.length; i++) {
      const tileDecisions = await this.getAppliedDecisions(i);
      result.push(...tileDecisions);
    }

    return result;
  }

  public async getAppliedDecisions(index: number): Promise<Decision[]> {
    const tileModels = await this.gridTileComponents();
    const tileTarget = tileModels[index];

    const tileModel = (await getBrowserValue<VerificationGridTileComponent>(tileTarget, "model")) as SubjectWrapper;
    return this.subjectDecisions(tileModel);
  }

  public async tileHighlightColors(): Promise<CssVariable[]> {
    const values: CssVariable[] = [];
    const tiles = await this.gridTileComponents();

    for (const tile of tiles) {
      const model = (await getBrowserValue<VerificationGridTileComponent>(tile, "model")) as SubjectWrapper;
      const modelDecisions = this.subjectDecisions(model);

      if (modelDecisions.length > 0) {
        const tileColors = modelDecisions.map((tileModel) => decisionColor(tileModel));
        values.push(...tileColors);
      }
    }

    return values;
  }

  public async highlightedTiles(): Promise<number[]> {
    const gridTiles = await this.gridTileComponents();

    const highlightedTiles: Locator[] = [];

    for (const tile of gridTiles) {
      const model = (await getBrowserValue<VerificationGridTileComponent>(tile, "model")) as SubjectWrapper;
      const modelDecisions = this.subjectDecisions(model);

      const isHighlighted = modelDecisions.length > 0;
      if (isHighlighted) {
        highlightedTiles.push(tile);
      }
    }

    return highlightedTiles.map((_, i) => i);
  }

  public async playingSpectrograms(): Promise<Locator[]> {
    return this.asyncFilter(await this.spectrogramComponents(), async (spectrogram) => {
      const value = await getBrowserValue<SpectrogramComponent>(spectrogram, "paused");
      return !value;
    });
  }

  public subjectDecisions(subject: SubjectWrapper): Decision[] {
    const subjectClassifications = Array.from(subject.classifications.values());

    // prettier wants to inline all of these into one line, but I think that
    // separating verifications and classifications into separate lines makes
    // the code easier to read
    // prettier-ignore
    return [
        ...(subject.verification ? [subject.verification] : []),
        ...subjectClassifications,
    ];
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

  public async isAudioPlaying(index: number): Promise<boolean> {
    const spectrogram = await this.spectrogramComponent(index);
    const value = await getBrowserValue<SpectrogramComponent>(spectrogram, "paused");
    return !value as boolean;
  }

  public async audioPlaybackTime(index: number): Promise<number> {
    const spectrogram = await this.spectrogramComponent(index);
    return await getBrowserSignalValue<SpectrogramComponent, number>(spectrogram, "currentTime");
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

  public async progressBarCompletedSize() {
    return await this.gridProgressCompletedSegment().evaluate((element: HTMLSpanElement) => element.style.width);
  }

  public async progressBarHeadSize() {
    return await this.gridProgressHeadSegment().evaluate((element: HTMLSpanElement) => element.style.width);
  }

  public async progressBarValueToPercentage(value: number): Promise<string> {
    const progressBar = this.gridProgressBar();

    const maxValue = (await getBrowserValue<ProgressBar>(progressBar, "total")) as number;
    const percentage = 100 * (value / maxValue);

    return `${percentage}%`;
  }

  public async progressBarCompletedTooltip() {
    const tooltip = this.gridProgressBarCompletedTooltip();
    return await getBrowserValue<SlTooltip>(tooltip, "content");
  }

  public async progressBarViewHeadTooltip() {
    const tooltip = this.gridProgressBarViewHeadTooltip();
    return await getBrowserValue<SlTooltip>(tooltip, "content");
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

  public async progressMeterColors(index = 0): Promise<string[]> {
    const segments = await this.gridTileProgressMeterSegments(index);

    const colors = segments.map(
      async (item: Locator) =>
        await item.evaluate((element: HTMLSpanElement) => {
          const styles = window.getComputedStyle(element);
          return styles.backgroundColor;
        }),
    );

    return await Promise.all(colors);
  }

  public async progressMeterTooltips(index = 0): Promise<string[]> {
    const segments = await this.gridTileProgressMeterTooltips(index);
    const tooltips = segments.map(async (tooltip: Locator) => await getBrowserAttribute(tooltip, "content"));
    return await Promise.all(tooltips);
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

  public async isBootstrapDialogOpen(): Promise<boolean> {
    return await this.bootstrapDialog().evaluate((element: VerificationBootstrapComponent) => element.open);
  }

  // actions
  public async nextPage() {
    await this.nextPageButton().click();
  }

  /** Plays selected grid tiles using the play/pause keyboard shortcut */
  public async shortcutGridPlay() {
    // TODO: for some reason, importing static properties into our fixtures
    // breaks the test bundling.
    // We should figure out why this happens and fix it.
    // await this.page.keyboard.press(MediaControlsComponent.playShortcut);

    await this.page.keyboard.press(SPACE_KEY);
  }

  public async shortcutGridPause() {
    await this.shortcutGridPlay();
  }

  public async playSpectrogram(index: number) {
    const gridTile = await this.gridTileComponent(index);
    const playButton = gridTile.locator("sl-icon[name='play']").first();

    await playButton.scrollIntoViewIfNeeded();

    const targetAudioElement = await this.audioElement(index);
    const playEvent = catchLocatorEvent(targetAudioElement, "play");
    await playButton.click();
    await playEvent;
  }

  public async pauseSpectrogram(index: number) {
    const gridTiles = await this.gridTileComponents();
    const pauseButton = gridTiles[index].locator("sl-icon[name='pause']").first();
    await pauseButton.click();
  }

  public async openSettingsMenu(index: number) {
    const settingsTarget = await this.mediaControlsComponent(index);
    await settingsTarget.locator(".settings-menu-item").click();
  }

  /**
   * Changes the brightness of the grid tile through the media controls
   * brightness slider by dragging the slider to the specified value.
   */
  public async changeBrightness(index: number, value: number) {
    await this.openSettingsMenu(index);

    const brightnessMenu = await this.brightnessControlsMenu(index);
    await brightnessMenu.click();

    const input = await this.brightnessControlsInput(index);
    await dragSlider(this.page, input, value);
  }

  public async openBootstrapDialog() {
    await this.bootstrapDialogButton().click({ force: true });
  }

  public async dismissBootstrapDialog() {
    await this.dismissBootstrapDialogButton().click();
  }

  public async bootstrapDialogSlideTitle(): Promise<string> {
    const slideTitle = await this.bootstrapSlideTitleElement().textContent();
    return slideTitle ?? "";
  }

  public async createSubSelection(items: number[], modifiers?: KeyboardModifiers) {
    const gridTiles = await this.gridTileContainers();

    for (const index of items) {
      await gridTiles[index].click({ modifiers });
    }
  }

  public async subSelectRange(start: number, end: number, modifiers: KeyboardModifiers = []) {
    // when sub-selecting a range, we want the first item to be selected without
    // holding down the shift key, then we should hold down the shift key when
    // selecting the end of the range
    await this.createSubSelection([start], modifiers);
    await this.createSubSelection([end], ["Shift", ...modifiers]);
  }

  public async createSelectionBox(start: MousePosition, end: MousePosition, modifiers: KeyboardModifiers = []) {
    await dragSelection(this.page, start, end, modifiers);
  }

  public async makeDecision(decision: number) {
    const decisionComponents = await this.decisionButtons();
    await decisionComponents[decision].click();
  }

  public async makeSkipDecision() {
    await this.skipDecisionButton().click();
  }

  public async viewPreviousHistoryPage() {
    await this.previousPageButton().click();
  }

  public async viewNextHistoryPage() {
    const targetButton = this.nextPageButton();
    await expect(targetButton).toBeEnabled();
    await targetButton.dispatchEvent("click");
  }

  public async continueVerifying() {
    const targetButton = this.continueVerifyingButton();
    await expect(targetButton).toBeEnabled();
    await targetButton.dispatchEvent("click");
  }

  public async selectFile() {
    await this.fileInputButton().setInputFiles("file.json");
  }

  public async getPopulatedGridSize(): Promise<number> {
    const gridSize = await getBrowserValue<VerificationGridComponent>(this.gridComponent(), "populatedTileCount");
    return gridSize as number;
  }

  public async getGridShape(): Promise<GridShape> {
    const targetGrid = this.gridComponent();
    const columns = (await getBrowserValue<VerificationGridComponent>(targetGrid, "columns")) as number;
    const rows = (await getBrowserValue<VerificationGridComponent>(targetGrid, "rows")) as number;
    return { columns, rows };
  }

  public async getGridTileSize(): Promise<Size> {
    // because all the grid tiles should be the same size, we can just check the
    // first grid tile and get its size
    const gridTiles = await this.gridTileComponents();
    const targetGridTile = gridTiles[0];

    const boundingBox = await targetGridTile.boundingBox();
    if (!boundingBox) {
      throw new Error("Grid tile bounding box not found");
    }

    return { width: boundingBox.width, height: boundingBox.height };
  }

  // change attributes
  public async changeSelectionMode(mode: SelectionObserverType) {
    // we use "as any" here because the setBrowserAttribute helper typing checks
    // for class properties, but cannot identify attribute aliases
    // TODO: this type casting should be removed once the helpers typing is corrected
    await setBrowserAttribute<VerificationGridComponent>(this.gridComponent(), "selection-behavior" as any, mode);
  }

  public async changeGridSize(value: number) {
    await setBrowserAttribute<VerificationGridComponent>(this.gridComponent(), "grid-size" as any, value.toString());
  }

  public async changeGridSource(value: string) {
    await setBrowserAttribute<DataSourceComponent>(this.dataSourceComponent(), "src", value);
  }

  public async changeSourceLocal(local: boolean) {
    const targetedBrowserAttribute = "local";
    const strategy = local ? setBrowserAttribute : removeBrowserAttribute;
    await strategy<DataSourceComponent>(this.dataSourceComponent(), targetedBrowserAttribute);
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

  public async onlyShowTileOutlines(): Promise<void> {
    await this.page.addStyleTag({
      content: "* { visibility: hidden; }",
    });

    const gridTiles = await this.gridTileComponents();
    for (const tile of gridTiles) {
      await tile.evaluate((element: VerificationGridTileComponent) => {
        element.style.border = "red 2px solid";
        element.style.visibility = "visible";
      });
    }

    const tileContents = await this.gridTileContainers();
    for (const tile of tileContents) {
      await tile.evaluate((element: HTMLElement) => {
        element.style.visibility = "hidden";
      });
    }
  }

  public async highlightSelectAllTiles() {
    const verificationGrid = this.gridComponent();
    const bounding = await verificationGrid.boundingBox();
    if (!bounding) {
      throw new Error("Could not get the bounding box of the verification grid");
    }

    const start = { x: bounding.x, y: bounding.y };
    const end = { x: bounding.x + bounding.width, y: bounding.y + bounding.height };

    await this.createSelectionBox(start, end);
  }

  private async changeGridSetting(key: keyof VerificationGridSettings, value: boolean) {
    await this.gridComponent().evaluate(
      (element: VerificationGridComponent, { key, value }) => {
        element.settings[key].value = value;
      },
      { key, value },
    );
  }

  // A VERY hacky function to filter an array using an async predicate
  // I have purposely not added this to a helper file to try and discourage its
  // use and limit its scope
  // TODO: remove this method
  private async asyncFilter<T>(items: T[], predicate: (item: T, i: number) => Promise<boolean>): Promise<T[]> {
    const results = await Promise.all(items.map(predicate));
    return items.filter((_v, index) => results[index]);
  }
}

export const verificationGridFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
