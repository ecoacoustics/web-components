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
  mockDeviceSize,
  removeBrowserAttribute,
  setBrowserAttribute,
  testBreakpoints,
  waitForContentReady,
} from "../helpers";
import {
  MousePosition,
  SelectionObserverType,
  VerificationGridComponent,
  VerificationGridSettings,
} from "../../components/verification-grid/verification-grid";
import { Rect, Size } from "../../models/rendering";
import { GridShape } from "../../helpers/controllers/dynamic-grid-sizes";
import { SubjectWrapper } from "../../models/subject";
import { Decision } from "../../models/decisions/decision";
import { expect } from "../assertions";
import { KeyboardModifiers } from "../../helpers/types/playwright";
import { decisionColor } from "../../services/colors";
import { CssVariable } from "../../helpers/types/advancedTypes";
import { SlTooltip } from "@shoelace-style/shoelace";
import { SPACE_KEY } from "../../helpers/keyboard";
import { VerificationGridTileComponent } from "../../components/verification-grid-tile/verification-grid-tile";
import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import { ProgressBar } from "../../components/progress-bar/progress-bar";
import { AxesComponent } from "../../components/axes/axes";
import { VerificationBootstrapComponent } from "../../components/bootstrap-modal/bootstrap-modal";
import { DataSourceComponent } from "../../components/data-source/data-source";
import { createFixture, setContent } from "../fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public hostAppInput = () => this.page.getByTestId("host-app-input").first();

  public gridComponent = () => this.page.locator("oe-verification-grid").first();
  public gridContainer = () => this.page.locator("#grid-container").first();
  public dataSourceComponent = () => this.page.locator("oe-data-source").first();
  public gridTileComponents = () => this.page.locator("oe-verification-grid-tile");
  public axesComponents = () => this.page.locator("oe-axes");
  public infoCardComponents = () => this.page.locator("oe-info-card");

  public bootstrapDialog = () => this.page.locator("oe-verification-bootstrap").first();
  public bootstrapSlideTitle = () => this.page.locator(".slide-title").first();
  public bootstrapDialogButton = () => this.page.getByTestId("help-dialog-button").first();
  public dismissBootstrapDialogButton = () => this.page.getByTestId("dismiss-bootstrap-dialog-btn").first();

  public verificationDecisions = () => this.page.locator("oe-verification").all();
  public classificationDecisions = () => this.page.locator("oe-classification").all();
  public decisionButtons = () => this.page.locator(".decision-button").all();
  public decisionButtonsText = () => this.page.locator(".button-text").all();

  public fileInputButton = () => this.page.locator(".file-input").first();
  public nextPageButton = () => this.page.getByTestId("next-page-button").first();
  public continueVerifyingButton = () => this.page.getByTestId("continue-verifying-button").first();
  public previousPageButton = () => this.page.getByTestId("previous-page-button").first();
  public downloadResultsButton = () => this.page.getByTestId("download-results-button").first();

  public gridTileContainers = () => this.page.locator(".tile-container");
  public gridTileProgressMeters = () => this.page.locator(".progress-meter");
  public gridTileProgressMeterSegments = (index = 0) =>
    this.gridTileProgressMeters().nth(index).locator(".progress-meter-segment");
  public gridTileProgressMeterTooltips = (index = 0) => this.gridTileProgressMeters().nth(index).locator("sl-tooltip");

  public gridTilePlaceholders = () => this.page.locator(".tile-placeholder");

  public gridProgressBars = () => this.page.locator("oe-progress-bar");
  public gridProgressBarCompletedTooltip = () => this.gridProgressBars().getByTestId("completed-tooltip").first();
  public gridProgressBarViewHeadTooltip = () => this.gridProgressBars().getByTestId("view-head-tooltip").first();
  public gridProgressCompletedSegment = () => this.gridProgressBars().locator(".completed-segment").first();
  public gridProgressHeadSegment = () => this.gridProgressBars().locator(".head-segment").first();

  public spectrogramComponents = () => this.page.locator("oe-spectrogram").all();
  public spectrogramComponent = async (index = 0) =>
    this.gridTileComponents().nth(index).locator("oe-spectrogram").first();
  public gridTileComponent = async (index = 0) => this.gridTileComponents().nth(index);
  public audioElement = async (index = 0) => (await this.spectrogramComponent(index)).locator("audio").first();

  public mediaControlsComponent = (index = 0) =>
    this.gridTileContainers().nth(index).locator("oe-media-controls").first();
  public brightnessControlsMenu = (index = 0) => this.gridTileContainers().nth(index).getByText("Brightness");
  public brightnessControlsInput = (index = 0) => this.gridTileContainers().nth(index).locator("input").first();

  public headerControls = () => this.page.locator(".header-controls").first();
  public footerControls = () => this.page.locator(".footer-controls").first();

  public indicatorLines = () => this.page.locator("oe-indicator #indicator-line");

  private verificationButton(decision: "true" | "false" | "skip"): Locator {
    const targetDecision = this.page.locator(`oe-verification[verified='${decision}']`).first();
    return targetDecision.locator("#decision-button");
  }

  private classificationButton(tag: string, decision: boolean): Locator {
    const targetDecision = this.page.locator(`oe-classification[tag='${tag}']`).first();
    return targetDecision.locator(`#${decision}-decision-button`);
  }

  public smallJsonInput = "http://localhost:3000/test-items-small.json";
  public testJsonInput = "http://localhost:3000/test-items.json";
  public secondJsonInput = "http://localhost:3000/test-items-2.json";
  private defaultTemplate = `
    <oe-verification verified="true" shortcut="Y"></oe-verification>
    <oe-verification verified="false" shortcut="N"></oe-verification>
  `;

  public async create(
    customTemplate = this.defaultTemplate,
    requiredSelectors: string[] = [],
    src = this.testJsonInput,
  ) {
    await this.setNoBootstrap();

    await setContent(
      this.page,
      `
      <oe-verification-grid id="verification-grid" autofocus>
        ${customTemplate}

        <oe-data-source
          slot="data-source"
          for="verification-grid"
          src="${src}"
        ></oe-data-source>
      </oe-verification-grid>
    `,
    );

    await waitForContentReady(this.page, [
      "oe-verification-grid",
      "oe-verification-grid-tile",
      "oe-data-source",
      ...requiredSelectors,
    ]);

    await expect(this.gridComponent()).toHaveJSProperty("loaded", true);
  }

  public async createWithBootstrap(
    customTemplate = this.defaultTemplate,
    requiredSelectors: string[] = [],
    src = this.testJsonInput,
  ) {
    await setContent(
      this.page,
      `
      <oe-verification-grid id="verification-grid" autofocus>
        ${customTemplate}

        <oe-data-source
          slot="data-source"
          for="verification-grid"
          src="${src}"
        ></oe-data-source>
      </oe-verification-grid>
    `,
    );

    await waitForContentReady(this.page, [
      "oe-verification-grid",
      "oe-verification-grid-tile",
      "oe-data-source",
      ...requiredSelectors,
    ]);

    await expect(this.gridComponent()).toHaveJSProperty("loaded", true);
  }

  public async createWithClassificationTask() {
    // prettier-ignore
    await this.create(`
      <oe-classification tag="car" true-shortcut="h"></oe-classification>
      <oe-classification tag="koala" true-shortcut="j"></oe-classification>
      <oe-classification tag="bird" true-shortcut="k"></oe-classification>
    `, [".decision-button"]);
  }

  public async createWithVerificationTask() {
    // prettier-ignore
    await this.create(`
      <oe-verification verified="true"></oe-verification>
      <oe-verification verified="false"></oe-verification>
    `, [".decision-button"]);
  }

  public async createWithAppChrome() {
    await this.setNoBootstrap();

    // this test fixture has an app chrome with a header so that the grid is not
    // flush with the top of the page
    // this allows us to test how the verification grid interacts with scrolling
    await setContent(
      this.page,
      `
      <header>
        <h1>Host Application</h1>
      </header>

      <div id="host-application-wrapper">
        <oe-verification-grid id="verification-grid" autofocus>
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
    `,
    );

    await waitForContentReady(this.page, ["oe-verification-grid", "oe-verification-grid-tile", "oe-data-source"]);

    await expect(this.gridComponent()).toHaveJSProperty("loaded", true);
  }

  /**
   * Stops the bootstrap from opening so that each test doesn't have to dismiss
   * the bootstrap dialog.
   */
  public async setNoBootstrap() {
    await this.page.evaluate(() => {
      localStorage.setItem("oe-auto-dismiss-bootstrap", "true");
    });
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
    return await this.gridTileComponents().count();
  }

  public async getViewHead(): Promise<number> {
    return await getBrowserValue<VerificationGridComponent, number>(this.gridComponent(), "viewHead");
  }

  public async getVerificationHead(): Promise<number> {
    return await getBrowserValue<VerificationGridComponent, number>(this.gridComponent(), "decisionHead");
  }

  public async selectedTileIndexes(): Promise<number[]> {
    return await this.gridComponent().evaluate((element: VerificationGridComponent) => {
      const tileElements = Array.from(element["gridTiles"]);
      return tileElements.filter((tile) => tile.selected).map((tile) => tile.index);
    });
  }

  public async selectedTiles(): Promise<SubjectWrapper[]> {
    return await getBrowserValue<VerificationGridComponent, SubjectWrapper[]>(
      this.gridComponent(),
      "currentSubSelection" as any,
    );
  }

  public async focusedIndex(): Promise<number> {
    return await getBrowserValue<VerificationGridComponent, number>(this.gridComponent(), "focusHead" as any);
  }

  public async getVerificationColor(decision: "true" | "false") {
    const decisionButton = this.verificationButton(decision);
    const colorPill = decisionButton.locator(".decision-color-pill");

    return await colorPill.evaluate((element: HTMLSpanElement) => {
      const styles = window.getComputedStyle(element);
      return styles.backgroundColor;
    });
  }

  public async getClassificationColor(tag: string, decision: boolean): Promise<string> {
    const decisionButton = this.classificationButton(tag, decision);
    const colorPill = decisionButton.locator(".decision-color-pill");

    return await colorPill.evaluate((element: HTMLSpanElement) => {
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

    const gridTiles = await this.gridTileComponents().all();
    for (let i = 0; i < gridTiles.length; i++) {
      const tileDecisions = await this.getAppliedDecisions(i);
      result.push(...tileDecisions);
    }

    return result;
  }

  public async getAppliedDecisions(index: number): Promise<Decision[]> {
    const tileTarget = this.gridTileComponents().nth(index);
    const tileModel = await getBrowserValue<VerificationGridTileComponent, SubjectWrapper>(tileTarget, "model");

    return this.subjectDecisions(tileModel);
  }

  public async tileHighlightColors(): Promise<CssVariable[]> {
    const values: CssVariable[] = [];
    const tiles = await this.gridTileComponents().all();

    for (const tile of tiles) {
      const model = await getBrowserValue<VerificationGridTileComponent, SubjectWrapper>(tile, "model");
      const modelDecisions = this.subjectDecisions(model);

      if (modelDecisions.length > 0) {
        const tileColors = modelDecisions.map((tileModel) => decisionColor(tileModel));
        values.push(...tileColors);
      }
    }

    return values;
  }

  public async highlightedTiles(): Promise<number[]> {
    const gridTiles = await this.gridTileComponents().all();

    const highlightedTiles: Locator[] = [];

    for (const tile of gridTiles) {
      const model = await getBrowserValue<VerificationGridTileComponent, SubjectWrapper>(tile, "model");
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

  public async gridDecisions(): Promise<Decision[]> {
    const gridSubjects = await getBrowserValue<VerificationGridComponent, SubjectWrapper[]>(
      this.gridComponent(),
      "subjects",
    );

    return gridSubjects.flatMap((subject) => this.subjectDecisions(subject));
  }

  public subjectDecisions(subject: SubjectWrapper): Decision[] {
    // although the SubjectWrapper's classification property is a map, it gets
    // converted into a regular object when it is serialized from the browser
    // to the playwright test environment
    // therefore, to get the values of the classification property, we use
    // the Object.values method
    const subjectClassifications = Array.from(Object.values(subject.classifications));

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
    return this.gridTileComponents().evaluateAll((tiles: VerificationGridTileComponent[]) =>
      tiles.map((tile) => tile.model),
    );
  }

  public async isAudioPlaying(index: number): Promise<boolean> {
    const spectrogram = await this.spectrogramComponent(index);
    const value = await getBrowserValue<SpectrogramComponent, number>(spectrogram, "paused");
    return !value;
  }

  public async audioPlaybackTime(index: number): Promise<number> {
    const spectrogram = await this.spectrogramComponent(index);
    return await getBrowserSignalValue<SpectrogramComponent, number>(spectrogram, "currentTime");
  }

  public async indicatorPosition(index: number): Promise<number> {
    const indicatorLine = this.indicatorLines().nth(index);

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
    const progressBar = this.gridProgressBars().first();

    const maxValue = await getBrowserValue<ProgressBar, number>(progressBar, "total");
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
    return await invokeBrowserMethod<VerificationGridComponent, boolean>(this.gridComponent(), "isViewingHistory");
  }

  public async downloadResults(): Promise<string> {
    const downloadButton = this.downloadResultsButton();
    return getBrowserAttribute(downloadButton, "href");
  }

  public async infoCardItem(index: number): Promise<{ key: unknown; value: unknown }[]> {
    const infoCard = this.infoCardComponents().nth(index);
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
    const segments = await this.gridTileProgressMeterSegments(index).all();

    const colors = segments.map(
      async (item: Locator) =>
        await item.evaluate((element: HTMLSpanElement) => {
          const styles = window.getComputedStyle(element);
          return styles.backgroundColor;
        }),
    );

    return await Promise.all(colors);
  }

  public async progressMeterTooltips(index = 0): Promise<(string | null)[]> {
    return await this.gridTileProgressMeterTooltips(index).evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("content")),
    );
  }

  public async areAxesVisible(): Promise<boolean> {
    // we don't want to check each axes component individually because it is
    // slow and does not provide much benefit
    // therefore, we check if the first axes component is visible
    const axesComponentToTest = this.axesComponents().first();

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
    // TODO: We should use the playShortcut definition here
    // see: https://github.com/ecoacoustics/web-components/issues/289
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
    const gridTile = this.gridTileComponents().nth(index);
    const pauseButton = gridTile.locator("sl-icon[name='pause']").first();
    await pauseButton.click();
  }

  public async openSettingsMenu(index: number) {
    const settingsTarget = this.mediaControlsComponent(index);
    await settingsTarget.locator(".settings-menu-item").click();
  }

  /**
   * Changes the brightness of the grid tile through the media controls
   * brightness slider by dragging the slider to the specified value.
   */
  public async changeBrightness(index: number, value: number) {
    await this.openSettingsMenu(index);

    const brightnessMenu = this.brightnessControlsMenu(index);
    await brightnessMenu.click();

    const input = this.brightnessControlsInput(index);
    await dragSlider(this.page, input, value);
  }

  public async openBootstrapDialog() {
    await this.bootstrapDialogButton().click();
  }

  public async createSubSelection(items: number | number[], modifiers?: KeyboardModifiers) {
    const gridTiles = this.gridTileContainers();

    const itemArray = Array.isArray(items) ? items : [items];
    for (const index of itemArray) {
      await gridTiles.nth(index).click({ modifiers });
    }
  }

  public async subSelectRange(start: number, end: number, modifiers: KeyboardModifiers = []) {
    // when sub-selecting a range, we want the first item to be selected without
    // holding down the shift key, then we should hold down the shift key when
    // selecting the end of the range
    await this.createSubSelection([start], modifiers);
    await this.createSubSelection([end], ["Shift", ...modifiers]);
  }

  // TODO: Add support for negative selection
  public async highlightSelectTiles(
    startTileIndex: number,
    endTileIndex = startTileIndex,
    modifiers: KeyboardModifiers = [],
  ) {
    const startTile = this.gridTileComponents().nth(startTileIndex);
    const startLocation = await startTile.boundingBox();
    if (!startLocation) {
      throw new Error("Could not get bounding box of the start tile");
    }

    let endLocation: Rect | null = null;
    if (startTileIndex !== endTileIndex) {
      const endTile = this.gridTileComponents().nth(endTileIndex);
      endLocation = await endTile.boundingBox();
    } else {
      endLocation = startLocation;
    }

    if (!endLocation) {
      throw new Error("Could not get bounding box of end tile");
    }

    const start: MousePosition = { x: startLocation.x, y: startLocation.y };
    const end: MousePosition = {
      x: endLocation.x + endLocation.width,
      y: endLocation.y + endLocation.height,
    };

    await this.createSelectionBox(start, end, modifiers);
  }

  public async createSelectionBox(start: MousePosition, end: MousePosition, modifiers: KeyboardModifiers = []) {
    await dragSelection(this.page, start, end, modifiers);
  }

  public async makeVerificationDecision(decision: "true" | "false") {
    // the decision-made event is only emitted from the verification grid
    // component once the decision has been fully processed.
    const decisionEvent = catchLocatorEvent(this.gridComponent(), "decision-made");

    const decisionButton = this.verificationButton(decision);
    await decisionButton.click();

    await decisionEvent;
  }

  public async makeClassificationDecision(tag: string, decision: boolean) {
    const decisionEvent = catchLocatorEvent(this.gridComponent(), "decision-made");

    const decisionButton = this.classificationButton(tag, decision);
    await decisionButton.click();

    await decisionEvent;
  }

  public async makeSkipDecision() {
    const decisionButton = this.verificationButton("skip");
    await decisionButton.click();
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

  public async selectFile(fileName = "file.json") {
    await this.fileInputButton().setInputFiles(fileName);
  }

  public async getPopulatedGridSize(): Promise<number> {
    const gridSize = await getBrowserValue<VerificationGridComponent>(this.gridComponent(), "populatedTileCount");
    return gridSize as number;
  }

  public async getGridShape(): Promise<GridShape> {
    const targetGrid = this.gridComponent();
    const columns = await getBrowserValue<VerificationGridComponent, number>(targetGrid, "columns");
    const rows = await getBrowserValue<VerificationGridComponent, number>(targetGrid, "rows");
    return { columns, rows };
  }

  public async getGridTileSize(): Promise<Size> {
    // because all the grid tiles should be the same size, we can just check the
    // first grid tile and get its size
    const targetGridTile = this.gridTileComponents().first();

    const boundingBox = await targetGridTile.boundingBox();
    if (!boundingBox) {
      throw new Error("Grid tile bounding box not found");
    }

    return { width: boundingBox.width, height: boundingBox.height };
  }

  // change attributes
  public async changeProgressBarPosition(position: string) {
    await setBrowserAttribute(this.gridComponent(), "progress-bar-position" as any, position);
  }

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
    const loadedEvent = catchLocatorEvent(this.gridComponent(), "grid-loaded");
    await setBrowserAttribute<DataSourceComponent>(this.dataSourceComponent(), "src", value);
    await loadedEvent;
  }

  public async changeSourceLocal(local: boolean) {
    const targetedBrowserAttribute = "local";
    const strategy = local ? setBrowserAttribute : removeBrowserAttribute;
    await strategy<DataSourceComponent>(this.dataSourceComponent(), targetedBrowserAttribute);
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

    const gridTiles = await this.gridTileComponents().all();
    for (const tile of gridTiles) {
      await tile.evaluate((element: VerificationGridTileComponent) => {
        element.style.border = "red 2px solid";
        element.style.visibility = "visible";
      });
    }

    await this.gridTileContainers().evaluateAll((tiles) => {
      for (const tile of tiles) {
        tile.style.visibility = "hidden";
      }
    });
  }

  public async highlightSelectAllTiles() {
    const gridContainer = this.gridContainer();
    const bounding = await gridContainer.boundingBox();
    if (!bounding) {
      throw new Error("Could not get the bounding box of the verification grid");
    }

    const start = { x: bounding.x, y: bounding.y };
    const end = { x: bounding.x + bounding.width, y: bounding.y + bounding.height };

    await this.createSelectionBox(start, end);
  }

  public async changeToMobile() {
    const target = this.gridComponent();
    await target.evaluate((element: VerificationGridComponent) => {
      element["isMobileDevice"] = () => true;
    });

    const viewportMock = mockDeviceSize(testBreakpoints.mobile);
    await viewportMock(this.page);
  }

  public async changeToDesktop() {
    const target = this.gridComponent();
    await target.evaluate((element: VerificationGridComponent) => {
      element["isMobileDevice"] = () => false;
    });

    const viewportMock = mockDeviceSize(testBreakpoints.desktop);
    await viewportMock(this.page);
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

export const verificationGridFixture = createFixture(TestPage);
