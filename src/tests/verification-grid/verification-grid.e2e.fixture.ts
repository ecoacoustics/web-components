import { Locator, Page } from "@playwright/test";
import {
  catchLocatorEvent,
  dragSelection,
  dragSlider,
  getBrowserAttribute,
  getBrowserSignalValue,
  getBrowserValue,
  getCssVariableStyle,
  invokeBrowserMethod,
  mockDeviceSize,
  pressKey,
  removeBrowserAttribute,
  setBrowserAttribute,
  testBreakpoints,
  waitForContentReady,
} from "../helpers/helpers";
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
import { decisionColor } from "../../services/colors/colors";
import { CssVariable } from "../../helpers/types/advancedTypes";
import { SlTooltip } from "@shoelace-style/shoelace";
import { SPACE_KEY } from "../../helpers/keyboard";
import { VerificationGridTileComponent } from "../../components/verification-grid-tile/verification-grid-tile";
import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import { ProgressBar } from "../../components/progress-bar/progress-bar";
import { VerificationBootstrapComponent } from "../../components/bootstrap-modal/bootstrap-modal";
import { DataSourceComponent } from "../../components/data-source/data-source";
import { createFixture, setContent } from "../fixtures";

type MockNewTagOptions = "Abbots Babbler" | "Brush Turkey" | "Noisy Miner" | "tag1" | "tag2" | "tag3" | "tag4";

class TestPage {
  public constructor(public readonly page: Page) {}

  public hostAppInput = () => this.page.getByTestId("host-app-input").first();

  public gridComponent = () => this.page.locator("oe-verification-grid").first();
  public dataSourceComponent = () => this.page.locator("oe-data-source").first();
  public gridTileComponents = () => this.page.locator("oe-verification-grid-tile");
  public indicatorComponents = () => this.page.locator("oe-indicator");
  public axesComponents = () => this.page.locator("oe-axes");
  public annotateComponents = () => this.page.locator("oe-annotate");
  public taskMeterComponents = () => this.page.locator("oe-task-meter");
  public tagTemplateComponents = () => this.page.locator("oe-subject-tag");
  public mediaControlsComponents = () => this.page.locator("oe-media-controls");
  public infoCardComponents = () => this.page.locator("oe-info-card");

  public gridContainer = () => this.page.locator("#grid-container").first();
  public messageOverlay = () => this.page.locator(".message-overlay");

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
  public continueVerifyingButton = () => this.page.locator("#continue-verifying-button");
  public previousPageButton = () => this.page.getByTestId("previous-page-button").first();
  public downloadResultsButton = () => this.page.getByTestId("download-results-button").first();

  public gridTileContainers = () => this.page.locator(".tile-container");
  public gridTileTaskMeters = () => this.page.locator(".task-meter");
  public gridTileTaskMeterSegments = (index = 0) => this.gridTileTaskMeters().nth(index).locator(".task-meter-segment");
  public gridTileTaskMeterTooltips = (index = 0) => this.gridTileTaskMeters().nth(index).locator("sl-tooltip");
  public gridTileTagText = () => this.page.getByTestId("tile-tag-text");

  public gridTilePlaceholders = () => this.page.locator(".tile-placeholder");

  public gridProgressBars = () => this.page.locator("oe-progress-bar");
  public gridProgressBarCompletedTooltip = () => this.gridProgressBars().getByTestId("completed-tooltip").first();
  public gridProgressBarViewHeadTooltip = () => this.gridProgressBars().getByTestId("view-head-tooltip").first();
  public gridProgressCompletedSegment = () => this.gridProgressBars().locator(".completed-segment").first();
  public gridProgressHeadSegment = () => this.gridProgressBars().locator(".head-segment").first();

  public spectrogramComponents = () => this.page.locator("oe-spectrogram");
  public spectrogramComponent = (index = 0) => this.gridTileComponents().nth(index).locator("oe-spectrogram").first();
  public gridTileComponent = (index = 0) => this.gridTileComponents().nth(index);
  public audioElement = (index = 0) => this.spectrogramComponent(index).locator("audio").first();

  public brightnessControlsMenu = (index = 0) => this.gridTileContainers().nth(index).getByText("Brightness");
  public brightnessControlsInput = (index = 0) => this.gridTileContainers().nth(index).locator("input").first();

  public headerControls = () => this.page.locator(".header-controls").first();
  public footerControls = () => this.page.locator(".footer-container").first();

  public indicatorLines = () => this.page.locator("oe-indicator #indicator-line");

  private newTagSearchResults = () => this.page.locator(".typeahead-result-action");

  public skipButton = () => this.skipComponent().locator("#decision-button").first();
  private skipComponent = () => this.page.locator("oe-skip").first();

  public moreInformationButtons = () => this.page.locator("#more-information-button");
  public unscopedButton = () => this.page.locator("#unscoped-button").first();

  public verificationButton(decision: "true" | "false"): Locator {
    const targetDecision = this.page.locator(`oe-verification[verified='${decision}']`).first();
    return targetDecision.locator("#decision-button");
  }

  public classificationButton(tag: string, decision: boolean): Locator {
    const targetDecision = this.page.locator(`oe-classification[tag='${tag}']`).first();
    return targetDecision.locator(`#${decision.toString()}-decision-button`);
  }

  public tagPromptButton(): Locator {
    const targetDecision = this.page.locator("oe-tag-prompt").first();
    return targetDecision.locator(`#decision-button`);
  }

  public readonly smallJsonInput = "http://localhost:3000/test-items-small.json";
  public readonly testJsonInput = "http://localhost:3000/test-items.json";
  public readonly secondJsonInput = "http://localhost:3000/test-items-2.json";
  private readonly defaultTemplate = `
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

    await expect(this.gridComponent()).toHaveJSProperty("loadState", "loaded");
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

    await expect(this.gridComponent()).toHaveJSProperty("loadState", "loaded");
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

  public async createWithCompoundTask() {
    await this.create(
      `
      <oe-verification verified="true"></oe-verification>
      <oe-verification verified="false"></oe-verification>
      <oe-verification verified="skip"></oe-verification>

      <oe-tag-prompt
        when="(subject) => subject?.verification?.confirmed === 'false'"
        search="(searchTerm) => {
          const testedTags = [
            { text: 'Abbots Babbler' },
            { text: 'Brush Turkey' },
            { text: 'Noisy Miner' },
            { text: 'tag1' },
            { text: 'tag2' },
            { text: 'tag3' },
            { text: 'tag4' },
          ];

          return testedTags.filter((tag) => tag.text.includes(searchTerm));
        }"
      ></oe-tag-prompt>
    `,
      [".decision-button"],
    );
  }

  public async createWithNoTask() {
    await this.create("");
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

    await expect(this.gridComponent()).toHaveJSProperty("loadState", "loaded");
  }

  public async createWithInvalidTemplate() {
    await this.setNoBootstrap();

    // The <template> passed into the verification grid is missing both the
    // <oe-subject-tag> and <oe-task-meter> elements that are required.
    await setContent(
      this.page,
      `
      <oe-verification-grid id="verification-grid">
        <template>
          <oe-spectrogram></oe-spectrogram>
          <oe-media-controls></oe-media-controls>
        </template>

        <oe-data-source
          slot="data-source"
          src="${this.testJsonInput}"
          for="verification-grid"
        ></oe-data-source>
      </oe-verification-grid>
    `,
    );

    await waitForContentReady(this.page, ["oe-verification-grid", "oe-data-source"]);

    // By having an except statement here, playwright will continue running this
    // assertion until it passes or the test times out (30 seconds).
    // We do this so that we know the entire grid has loaded.
    await expect(this.gridComponent()).toHaveJSProperty("loadState", "configuration-error");
  }

  public async createWithValidTemplate() {
    await this.create(
      `
      <template>
        <div class="tile-spacing">
          <oe-subject-tag></oe-subject-tag>
          <oe-media-controls for="spectrogram"></oe-media-controls>
        </div>

        <oe-axes>
          <oe-indicator>
            <oe-spectrogram id="spectrogram"></oe-spectrogram>
          </oe-indicator>
        </oe-axes>

        <div class="tile-block">
          <oe-task-meter></oe-task-meter>
        </div>

        <a href="#clicked" data-testid="link-with-href">link with href</a>
        <a data-testid="link-without-href">link without href</a>

        <button id="more-information-button" class="styled-button">
          more information
        </button>

        <style>
          /*
            We have to use a class here instead of just having a <button> css
            selector, because element selectors do not work inside of
            <template> styles.
          */
          .styled-button {
            background-color: blue;
            color: red;
          }
        </style>
      </template>

      <oe-verification verified="true" shortcut="Y">Koala</oe-verification>
      <oe-verification verified="false" shortcut="N">Not Koala</oe-verification>

      <oe-data-source
        src="http://localhost:3000/test-items.json"
        for="verification-grid"
      ></oe-data-source>

      <button id="unscoped-button" class="styled-button">
        unscoped button
      </button>
    `,
      ["#unscoped-button"],
    );
  }

  /**
   * Removes the **first** `<template>` content assigned to the verification
   * grids default slot.
   */
  public async removeCustomTemplate() {
    await this.gridComponent().evaluate((element: VerificationGridComponent) => {
      const templateToRemove = element.querySelector("template");
      if (!templateToRemove) {
        throw new Error("No <template> found to remove");
      }

      element.removeChild(templateToRemove);
    });
  }

  public async addCustomTemplate(content: string) {
    await this.gridComponent().evaluate((element: VerificationGridComponent, templateContent: string) => {
      const template = document.createElement("template");
      template.innerHTML = templateContent;
      element.appendChild(template);
    }, content);
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
    return await getCssVariableStyle(this.gridComponent(), "--oe-panel-color", "background");
  }

  public async skipColor(): Promise<string> {
    return await getCssVariableStyle(this.skipButton(), "--oe-decision-skip-color", "background");
  }

  public async notRequiredColor(): Promise<string> {
    return await getCssVariableStyle(this.verificationButton("false"), "--oe-not-required-color", "background");
  }

  public async getGridSize(): Promise<number> {
    return await this.gridTileComponents().count();
  }

  public async getViewHead(): Promise<number> {
    return await getBrowserValue<VerificationGridComponent, number>(this.gridComponent(), "viewHeadIndex");
  }

  public async getVerificationHead(): Promise<number> {
    return await getBrowserValue<VerificationGridComponent, number>(this.gridComponent(), "decisionHeadIndex");
  }

  public async selectedTileIndexes(): Promise<number[]> {
    return await this.gridComponent().evaluate((element: VerificationGridComponent) => {
      const tileElements = Array.from(element["gridTiles"]);
      return tileElements.filter((tile) => tile.selected).map((tile) => tile.index);
    });
  }

  public async focusedIndex(): Promise<number> {
    return await getBrowserValue<VerificationGridComponent, number>(this.gridComponent(), "focusHead" as any);
  }

  public async getVerificationColor(decision: "true" | "false") {
    const decisionButton = this.verificationButton(decision);
    const colorPill = decisionButton.locator(".decision-color-pill");

    return await colorPill.evaluate((element: HTMLSpanElement) => {
      const styles = window.getComputedStyle(element);
      return styles.background;
    });
  }

  public async getClassificationColor(tag: string, decision: boolean): Promise<string> {
    const decisionButton = this.classificationButton(tag, decision);
    const colorPill = decisionButton.locator(".decision-color-pill");

    return await colorPill.evaluate((element: HTMLSpanElement) => {
      const styles = window.getComputedStyle(element);
      return styles.background;
    });
  }

  public async getNewTagColor(): Promise<string> {
    const decisionButton = this.tagPromptButton();
    const colorPill = decisionButton.locator(".decision-color-pill");

    return await colorPill.evaluate((element: HTMLSpanElement) => {
      const styles = window.getComputedStyle(element);
      return styles.background;
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

  public async allAppliedDecisions(): Promise<(Decision | null)[]> {
    const result: (Decision | null)[] = [];

    const gridTiles = await this.gridTileComponents().all();
    for (let i = 0; i < gridTiles.length; i++) {
      const tileDecisions = await this.getAppliedDecisions(i);

      if (tileDecisions.length === 0) {
        result.push(null);
      } else {
        result.push(...tileDecisions);
      }
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
    return this.asyncFilter(await this.spectrogramComponents().all(), async (spectrogram) => {
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
    const subjectVerifications = subject.verification ? [subject.verification] : [];

    // prettier wants to inline all of these into one line, but I think that
    // separating verifications and classifications into separate lines makes
    // the code easier to read
    // prettier-ignore
    return [
        ...subjectVerifications,
        ...subjectClassifications,
    ];
  }

  public async verificationGridTileModels(): Promise<SubjectWrapper[]> {
    return this.gridTileComponents().evaluateAll((tiles: VerificationGridTileComponent[]) =>
      tiles.map((tile) => tile.model),
    );
  }

  public async isAudioPlaying(index: number): Promise<boolean> {
    const spectrogram = this.spectrogramComponent(index);
    const value = await getBrowserValue<SpectrogramComponent, number>(spectrogram, "paused");
    return !value;
  }

  public async audioPlaybackTime(index: number): Promise<number> {
    const spectrogram = this.spectrogramComponent(index);
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

    return `${percentage.toString()}%`;
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

  public async allProgressMeterColors(): Promise<string[][]> {
    const gridTiles = await this.gridTileTaskMeters().all();
    const allProgresses = gridTiles.map(async (_, index) => await this.progressMeterColors(index));

    return await Promise.all(allProgresses);
  }

  public async progressMeterColors(index = 0): Promise<string[]> {
    const segments = await this.gridTileTaskMeterSegments(index).all();

    const colors = segments.map(
      async (item: Locator) =>
        await item.evaluate((element: HTMLSpanElement) => {
          const styles = window.getComputedStyle(element);
          return styles.background;
        }),
    );

    return await Promise.all(colors);
  }

  public async allProgressMeterTooltips(): Promise<(string | null)[][]> {
    const gridTiles = await this.gridTileComponents().all();
    const allTooltips = gridTiles.map(async (_, index) => await this.progressMeterTooltips(index));
    return await Promise.all(allTooltips);
  }

  public async progressMeterTooltips(index = 0): Promise<(string | null)[]> {
    return await this.gridTileTaskMeterTooltips(index).evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("content")),
    );
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
    await pressKey(this.gridComponent(), SPACE_KEY);
  }

  public async shortcutGridPause() {
    await this.shortcutGridPlay();
  }

  public async playSpectrogram(index: number) {
    const gridTile = this.gridTileComponent(index);
    const playButton = gridTile.locator("sl-icon[name='play']").first();

    await playButton.scrollIntoViewIfNeeded();

    const targetAudioElement = this.audioElement(index);
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
    const settingsTarget = this.mediaControlsComponents().nth(index);
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

  public async subSelect(items: number | number[], modifiers?: KeyboardModifiers) {
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
    await this.subSelect([start], modifiers);
    await this.subSelect([end], ["Shift", ...modifiers]);
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

  public async makeNewTagDecision(selectedOption: MockNewTagOptions) {
    const decisionEvent = catchLocatorEvent(this.gridComponent(), "decision-made");

    // Clicking this button will open up the tag prompt dialog.
    await this.tagPromptButton().click();

    const resultButton = this.newTagSearchResults().filter({ hasText: selectedOption }).first();
    await resultButton.click();

    await decisionEvent;
  }

  public async viewPreviousHistoryPage() {
    // When navigating into history, the verification grid will have to load its
    // grid tiles again.
    // Therefore, we wait for the grid-loaded event to ensure that the grid has
    // finished loading before allowing the test to continue.
    const historyLoadedEvent = catchLocatorEvent(this.gridComponent(), "grid-loaded");
    await this.previousPageButton().click();
    await historyLoadedEvent;
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

  public async getTileCount(): Promise<number> {
    const gridSize = await getBrowserValue<VerificationGridComponent, number>(this.gridComponent(), "pageSize");
    return gridSize;
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

  public async changeGridSource(value: string | ReadonlyArray<any>) {
    const loadedEvent = catchLocatorEvent(this.gridComponent(), "grid-loaded");

    // If the value is a string, we assume that the it is a remote url data
    // source.
    if (typeof value === "string") {
      await setBrowserAttribute<DataSourceComponent>(this.dataSourceComponent(), "src", value);
      return await loadedEvent;
    }

    // If we receive an array, we create a callback that returns the items.
    if (Array.isArray(value)) {
      await this.gridComponent().evaluate((element: VerificationGridComponent, dataset: ReadonlyArray<any>) => {
        element.getPage = (): Promise<any> => Promise.resolve({ subjects: dataset });
      }, value);

      return await loadedEvent;
    }
  }

  public async changeSourceLocal(local: boolean) {
    const targetedBrowserAttribute = "local";
    const strategy = local ? setBrowserAttribute : removeBrowserAttribute;
    await strategy<DataSourceComponent>(this.dataSourceComponent(), targetedBrowserAttribute);
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
