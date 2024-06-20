import { customElement, property, query, queryAll, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, PropertyValueMap, TemplateResult } from "lit";
import { verificationGridStyles } from "./css/style";
import { queryAllDeeplyAssignedElements, queryDeeplyAssignedElement } from "../../helpers/decorators";
import { Verification, VerificationSubject } from "../../models/verification";
import { VerificationGridTile } from "../verification-grid-tile/verification-grid-tile";
import { Decision } from "../decision/decision";
import { Parser } from "@json2csv/plainjs";
import { VerificationParser } from "../../services/verificationParser";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import lucideCircleHelp from "lucide-static/icons/circle-help.svg?raw";
import { DataSource } from "../../../playwright";
import { VerificationHelpDialog } from "./help-dialog";
import colorBrewer from "colorbrewer";
import { booleanConverter } from "../../helpers/attributes";
import { sleep } from "../../helpers/utilities";
import { classMap } from "lit/directives/class-map.js";

export type SelectionObserverType = "desktop" | "tablet" | "default";
export type PageFetcher = (elapsedItems: number) => Promise<VerificationSubject[]>;
export type DecisionEvent = CustomEvent<{
  value: boolean;
  tag: string;
  additionalTags: string[];
  color: string;
  target: Decision;
}>;

type SelectionEvent = CustomEvent<{
  shiftKey: boolean;
  ctrlKey: boolean;
  index: number;
}>;

interface MousePosition {
  x: number;
  y: number;
}

// by keeping the elements position in a separate object, we can
// avoid doing DOM queries every time we need to check if the element
// is intersecting with the highlight box
interface IntersectionElement {
  position: DOMRectReadOnly;
  element: HTMLElement;
}

interface HighlightSelection {
  start: MousePosition;
  current: MousePosition;
  highlighting: boolean;
  elements: IntersectionElement[];
}

/**
 * A verification grid component that can be used to validate and verify audio events
 *
 * @example
 * ```html
 * <oe-verification-grid src="grid-items.json" gridSize="10">
 *   <oe-spectrogram slot="spectrogram"></oe-spectrogram>
 * </oe-verification-grid>
 * ```
 *
 * @property src - The source of the grid items
 * @property get-page - A callback function that returns a page of recordings
 * @property grid-size - The number of items to display in a single grid
 * @property key - An object key to use as the audio source
 * @property selection-behavior {desktop | tablet}
 *
 * @csspart sub-selection-checkbox - A css target for the sub-selection checkbox
 *
 * @slot - A template to display the audio event to be verified
 */
@customElement("oe-verification-grid")
export class VerificationGrid extends AbstractComponent(LitElement) {
  public static styles = verificationGridStyles;

  @property({ attribute: "grid-size", type: Number, reflect: true })
  public gridSize = 8;

  // we use pagedItems instead of page here so that if the grid size changes
  // half way through, we can continue verifying from where it left off
  @property({ attribute: "paged-items", type: Number, reflect: true })
  public pagedItems = 0;

  @property({ attribute: "selection-behavior", type: String, reflect: true })
  public selectionBehavior: SelectionObserverType = "default";

  @property({ type: String })
  public audioKey!: string;

  @property({ attribute: "auto-page", type: Boolean, converter: booleanConverter })
  public autoPage = true;

  @property({ attribute: "get-page", type: String })
  public getPage!: PageFetcher;

  @queryDeeplyAssignedElement({ selector: "template" })
  public gridItemTemplate!: HTMLTemplateElement;

  @queryAllDeeplyAssignedElements({ selector: "oe-decision" })
  public decisionElements!: Decision[];

  @queryAll("oe-verification-grid-tile")
  public gridTiles!: NodeListOf<VerificationGridTile>;

  @query("oe-verification-help-dialog")
  private helpDialog!: VerificationHelpDialog;

  @state()
  private spectrogramElements: TemplateResult<1> | TemplateResult<1>[] | undefined;

  @state()
  private historyHead = 0;

  @state()
  public dataSource: DataSource | undefined;

  public decisions: Verification[] = [];
  public undecidedTiles: Verification[] = [];
  private hiddenTiles = 0;

  // TODO: find a better way to do this
  private showingSelectionShortcuts = false;

  private keydownHandler = this.handleKeyDown.bind(this);
  private keyupHandler = this.handleKeyUp.bind(this);
  private blurHandler = this.handleWindowBlur.bind(this);
  private intersectionHandler = this.handleIntersection.bind(this);
  private intersectionObserver = new IntersectionObserver(this.intersectionHandler);

  private multiSelectHead: number | null = null;

  private serverCacheHead = this.gridSize;
  private serverCacheExhausted = false;
  private highlighting = false;
  private highlight: HighlightSelection = {
    start: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    highlighting: false,
    elements: [],
  };

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("keydown", this.keydownHandler);
    document.addEventListener("keyup", this.keyupHandler);
    window.addEventListener("blur", this.blurHandler);
  }

  public disconnectedCallback(): void {
    this.intersectionObserver.disconnect();
    document.removeEventListener("keydown", this.keydownHandler);
    document.removeEventListener("keyup", this.keyupHandler);
    window.removeEventListener("blur", this.blurHandler);
    super.disconnectedCallback();
  }

  public firstUpdated(): void {
    this.helpDialog.decisionElements = this.decisionElements;
  }

  protected async updated(change: PropertyValueMap<this>): Promise<void> {
    const reRenderKeys: (keyof this)[] = ["gridSize", "audioKey", "dataSource"];
    const elementsToObserve = this.gridTiles;

    const sourceInvalidationKeys: (keyof this)[] = ["getPage"];

    if (change.has("selectionBehavior")) {
      this.multiSelectHead = null;

      let selectionBehavior = this.selectionBehavior;

      if (selectionBehavior === "default") {
        selectionBehavior = this.isTouchDevice() ? "tablet" : "desktop";
      }

      this.decisionElements.forEach((element: Decision) => {
        element.selectionMode = selectionBehavior;
      });

      this.helpDialog.selectionBehavior = selectionBehavior;
    }

    const colors = colorBrewer.Dark2[8];
    this.decisionElements.forEach((element: Decision, i: number) => {
      const color = colors[i];
      element.color = color;
    });

    // TODO: figure out if there is a better way to do this invalidation
    if (sourceInvalidationKeys.some((key) => change.has(key))) {
      this.pagedItems = 0;
      this.decisions = [];

      // if the user is in the middle of viewing history when they load a new
      // verification file, we want to change back to the default verification
      // interface don't show any decision highlights, etc...
      this.verificationView();

      if (this.gridTiles?.length) {
        await this.renderCurrentPage();
      }
    }

    if (!elementsToObserve) {
      throw new Error("Fatal error: No grid tiles found");
    }

    for (const element of elementsToObserve) {
      this.intersectionObserver.observe(element);
    }

    if (reRenderKeys.some((key) => change.has(key))) {
      this.createSpectrogramElements();
    }

    if (change.has("pagedItems")) {
      this.handlePagination();
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.canSubSelect()) {
      return;
    }

    if (!this.showingSelectionShortcuts && event.altKey) {
      this.showSelectionShortcuts();
      // return early here because otherwise ctrl + alt + a would select all items
      // when the expected behavior is to add item a to the sub selection
      return;
    }

    if (event.ctrlKey && event.key === "a") {
      this.subSelectAll();
      return;
    }

    if (event.key === "Escape") {
      this.removeSubSelection();

      if (!this.isViewingHistory()) {
        this.removeDecisionButtonHighlight();
      }
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.previousPage();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.pageForwardHistory();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    event.preventDefault();

    if (!event.altKey) {
      this.hideSelectionShortcuts();
    }
  }

  // some keys add additional information to the screen
  // e.g. pressing Alt will show the selection keyboard shortcuts
  //
  // however, the alt key can also be used to switch virtual desktops in Windows
  // because of this, if the user switches virtual desktops, we never receive
  // the keyup event that is usually used to hide the additional information
  // therefore, we listen for the window blur event so that when the window
  // loses focus, we hide the additional information
  private handleWindowBlur(): void {
    this.hideSelectionShortcuts();

    if (!this.isViewingHistory()) {
      this.removeDecisionButtonHighlight();
    }
  }

  /** A non-idempotent method that re-renders the current virtual page */
  private async renderCurrentPage(): Promise<void> {
    const firstPage = await this.getPage(this.pagedItems);
    const verificationModels = firstPage.map(VerificationParser.parse);
    this.renderVirtualPage(verificationModels);
  }

  private showSelectionShortcuts(): void {
    const elements = this.gridTiles;
    for (const element of elements) {
      element.showKeyboardShortcuts = true;
    }

    this.showingSelectionShortcuts = true;
  }

  private hideSelectionShortcuts(): void {
    const elements = this.gridTiles;
    for (const element of elements) {
      element.showKeyboardShortcuts = false;
    }

    this.showingSelectionShortcuts = false;
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      if (entry.intersectionRatio < 1) {
        // at the very minimum, we always want one grid tile showing
        // even if this will cause some items to go off the screen
        const newProposedHiddenTiles = this.hiddenTiles + 1;
        if (newProposedHiddenTiles < this.gridSize) {
          // this.hideGridItems(newProposedHiddenTiles);
        }
      }
    }
  }

  // we could improve the performance here by creating a "selectionHandler" component property
  // which is set to handleDesktopSelection.bind(this) or handleTabletSelection.bind(this)
  // when the selection-behavior attribute is updated
  // (meaning that we don't have to evaluate the switch statement every selection event)
  // however, I deemed that it hurt readability and the perf hit is negligible
  private selectionHandler(selectionEvent: SelectionEvent): void {
    if (!this.canSubSelect()) {
      return;
    }

    switch (this.selectionBehavior) {
      case "default":
        this.handleDefaultSelection(selectionEvent);
        break;
      case "desktop":
        this.handleDesktopSelection(selectionEvent);
        break;
      case "tablet":
        this.handleTabletSelection(selectionEvent);
        break;
      default:
        console.error(`could not find selection behavior ${this.selectionBehavior}`);
        this.handleDesktopSelection(selectionEvent);
        break;
    }

    this.requestUpdate();
  }

  private canSubSelect(): boolean {
    return this.gridSize > 1;
  }

  /** @returns - True if the device is a touch device */
  private isTouchDevice(): boolean {
    // userAgentData is not shipped on all browsers. However, since we have
    // polyfilled the userAgentData object, this condition should always be true
    if (navigator.userAgentData) {
      return navigator.userAgentData.mobile;
    }

    // if this error is being thrown, the userAgentData polyfills are not
    // being applied
    throw new Error("Could not determine if the device is a touch device");
  }

  /**
   * @description
   * The default selection handler will infer the device type and
   * the selection behavior will be set to "tablet", otherwise it will be set
   * to "desktop"
   */
  private handleDefaultSelection(selectionEvent: SelectionEvent): void {
    if (this.isTouchDevice()) {
      this.handleTabletSelection(selectionEvent);
      return;
    }

    this.handleDesktopSelection(selectionEvent);
  }

  /**
   * @description
   * Click                  Select a single tile (de-selecting any other items)
   * Shift + click          Select a range of tiles (de-selecting any other items)
   * Ctrl + click           Toggles the selection state of a single tile (not effecting other tiles)
   * Ctrl + Shift + click   Select a range of tiles (not effecting other tiles)
   */
  private handleDesktopSelection(selectionEvent: SelectionEvent): void {
    const index = selectionEvent.detail.index;

    // in desktop mode, unless the ctrl key is held down, clicking an element
    // removes all other selected items
    if (!selectionEvent.detail.ctrlKey) {
      this.removeSubSelection();
    }

    // there are two different types of selections, range selection and single selection
    // if the shift key is held down, then we perform a "range" selection, if not
    // then we should perform a single selection
    if (selectionEvent.detail.shiftKey) {
      // if the user has never selected an item before, the multiSelectHead will be "null"
      // in this case, we want to start selecting from the clicked tile
      this.multiSelectHead ??= index;
      const selectionTail = index;

      this.addSubSelectionRange(this.multiSelectHead, selectionTail);
      return;
    }

    this.toggleSubSelection(index);
    this.multiSelectHead = index;
  }

  /**
   * @description
   * _Click_ Toggle the selection of a single tile (not effecting other tiles)
   */
  private handleTabletSelection(selectionEvent: SelectionEvent): void {
    this.toggleSubSelection(selectionEvent.detail.index);
  }

  private toggleSubSelection(index: number): void {
    const gridItems = Array.from(this.gridTiles);
    gridItems[index].selected = !gridItems[index].selected;
  }

  private addSubSelectionRange(start: number, end: number): void {
    const gridItems = Array.from(this.gridTiles);

    // if the user shift + clicks in a negative direction
    // e.g. select item 5 and then shift click item 2
    // we want to select all items from 2 to 5. Therefore, we swap the start and end values
    if (end < start) {
      [start, end] = [end, start];
    }

    // TODO: end should probably be exclusive when it calls this function
    for (let i = start; i <= end; i++) {
      gridItems[i].selected = true;
    }
  }

  private subSelectAll(): void {
    const elements = this.gridTiles;

    for (const element of elements) {
      element.selected = true;
    }
  }

  private removeSubSelection(): void {
    // we set elements as a variable because this.gridTiles uses a query selector
    // therefore, if we put it inside the for loop, we would be doing a DOM query
    // every cycle
    const elements = this.gridTiles;

    for (const element of elements) {
      element.selected = false;
    }
  }

  private isViewingHistory(): boolean {
    return this.historyHead !== 0;
  }

  private canNavigatePrevious(): boolean {
    const hasHistory = this.decisions.length > 0;
    const canNavigateBackHistory = this.historyHead < this.decisions.length;
    return hasHistory && canNavigateBackHistory;
  }

  private canNavigateNext(): boolean {
    const canPageNext = !(this.hiddenTiles >= this.gridSize) && !this.autoPage;
    const canNavigateInHistory = this.isViewingHistory() && this.historyHead > this.gridSize;
    return canPageNext || canNavigateInHistory;
  }

  private previousPage(): void {
    if (!this.canNavigatePrevious()) {
      return;
    }

    this.historyHead += this.gridSize;
    this.renderHistory(this.historyHead);
  }

  private pageForwardHistory(): void {
    if (!this.canNavigateNext()) {
      return;
    }

    this.historyHead -= this.gridSize;
    this.renderHistory(this.historyHead);
  }

  private renderHistory(head: number) {
    const decisionStart = Math.max(0, this.decisions.length - head);
    const decisionEnd = Math.min(this.decisions.length, decisionStart + this.gridSize);

    const decisionHistory = this.decisions.slice(decisionStart, decisionEnd);
    this.renderVirtualPage(decisionHistory);

    decisionHistory.forEach((decision: Verification, i: number) => {
      const color = this.decisionColor(decision);
      this.gridTiles[i].color = color;
    });

    this.historyView();
  }

  // changes the verification grid to the "history mode" layout
  private historyView(): void {
    this.showDecisionButtonHighlight();
  }

  // changes the verification grid to the "normal mode" layout
  private verificationView(): void {
    this.historyHead = 0;

    this.removeSubSelection();
    this.removeDecisionHighlight();
    this.removeDecisionButtonHighlight();
  }

  /** Returns the user from viewing/verifying history back to seeing new results */
  private resumeVerification(): void {
    this.renderCurrentPage();
    this.verificationView();
  }

  private async nextPage(pagedItems: number = this.gridSize): Promise<void> {
    this.removeSubSelection();
    this.removeDecisionHighlight();
    this.resetSpectrogramSettings();

    this.pagedItems += pagedItems;
    const nextPage = (await this.getPage(this.pagedItems)).map(VerificationParser.parse);

    // get all verification models that are not in the undecided tiles
    const undecidedUrls = this.undecidedTiles.map((tile: Verification) => tile.url);
    const decisionUrls = this.decisions.map((decision: Verification) => decision.url);
    const newVerificationModels = nextPage.filter(
      (model: Verification) => !undecidedUrls.includes(model.url) && !decisionUrls.includes(model.url),
    );

    const pageToRender = [...this.undecidedTiles, ...newVerificationModels];
    this.renderVirtualPage(pageToRender);
  }

  private async catchDecision(event: DecisionEvent) {
    const decision: boolean = event.detail.value;
    const tags: any[] =
      event.detail.tag === "*"
        ? this.decisionElements.map((model: Decision) => model.tag).filter((tag: any) => tag !== "*")
        : [event.detail.tag];
    const additionalTags: any[] = event.detail.additionalTags;

    const gridTiles = Array.from(this.gridTiles);
    const subSelection = gridTiles.filter((tile) => tile.selected);
    const hasSubSelection = subSelection.length > 0;

    const selectedTiles = hasSubSelection ? subSelection : gridTiles;
    const selectedItems = selectedTiles.map((tile) => tile.model);
    const value: Verification[] = [];

    for (const tag of tags) {
      for (const tile of selectedItems) {
        value.push(
          new Verification({
            ...tile,
            tag: { id: undefined, text: tag },
            confirmed: decision,
            additionalTags: additionalTags ?? [],
          }),
        );
      }
    }

    // if the user created a sub-selection, then all the tiles that are not
    // selected are "undecided", and a verification tag hasn't been added to it
    // in this case, we want to show it on the subsequent screens until they
    // make a decision
    this.undecidedTiles = [];
    if (hasSubSelection) {
      this.undecidedTiles = gridTiles
        .filter((tile: VerificationGridTile) => !subSelection.includes(tile))
        .map((tile: VerificationGridTile) => tile.model);
    }

    if (this.isViewingHistory()) {
      // when viewing history, we don't want to add the decision to the history
      // we want to update the decision that was made
      const decisionsToUpdate = this.decisions.filter((decision: Verification) =>
        selectedItems.some((item: Verification) => item.url === decision.url),
      );

      decisionsToUpdate.forEach((historicalDecision: Verification) => {
        historicalDecision.confirmed = decision;
        historicalDecision.additionalTags = additionalTags;
        historicalDecision.tag = { id: undefined, text: tags[0] };
      });

      // we have updated the decision about a tiles while viewing history
      // therefore, there will be an already existing outline around the
      // grid tile that we need to update
      this.createDecisionHighlight(selectedTiles, event.detail.color);

      // by returning early, we prevent the decision from being added to the
      // history and do not page forward
      return;
    }

    // if we are in the normal paging scenario, we want to add the decision to
    // the decision history as a new decision
    this.decisions.push(...value);
    this.dispatchEvent(new CustomEvent("decision-made", { detail: value }));

    if (this.autoPage) {
      this.showDecisionButtonHighlight([event.target as any]);
      this.createDecisionHighlight(selectedTiles, event.detail.color);
      await sleep(300);
      this.removeDecisionHighlight(selectedTiles);

      this.nextPage(value.length);
    }
  }

  private handlePagination(): void {
    const hasCreatedDecision = this.decisions.length >= this.pagedItems;
    if (!hasCreatedDecision) {
      return;
    }

    // const decisionItems = this.decisions.slice(this.decisions.length - this.gridSize, this.decisions.length);
  }

  private handleNextPageClick(): void {
    if (this.isViewingHistory()) {
      this.pageForwardHistory();
      return;
    }

    if (this.autoPage) {
      this.nextPage();
      return;
    }

    throw new Error("Could not determine pagination strategy");
  }

  private decisionColor(verification: Verification): string {
    const tagToMatch = verification.tag!.text;
    const additionalTagsToMatch = verification.additionalTags.toString();
    const verificationToMatch = verification.confirmed;

    const decisionButton = this.decisionElements.find((element: Decision) => {
      const tagMatches = element.tag === tagToMatch;
      const verificationMatches = element.verified === verificationToMatch;

      if (additionalTagsToMatch === "") {
        return tagMatches && verificationMatches;
      }

      const additionalTagsMatch = element.additionalTags === additionalTagsToMatch;
      return tagMatches && additionalTagsMatch && verificationMatches;
    });

    if (!decisionButton) {
      throw new Error("Could not find color to match decision");
    }

    return decisionButton.color;
  }

  private createDecisionHighlight(selectedTiles: VerificationGridTile[], color: string | string[]): void {
    selectedTiles.forEach((tile: VerificationGridTile, i: number) => {
      const derivedColor = Array.isArray(color) ? color[i] : color;
      tile.color = derivedColor;
    });
  }

  private removeDecisionHighlight(selectedTiles: VerificationGridTile[] = Array.from(this.gridTiles)): void {
    selectedTiles.forEach((tile: VerificationGridTile) => {
      tile.color = "var(--oe-panel-color)";
    });

    this.removeDecisionButtonHighlight();
  }

  private showDecisionButtonHighlight(elements: Decision[] = this.decisionElements): void {
    for (const decision of elements) {
      decision.showDecisionColor = true;
    }
  }

  private removeDecisionButtonHighlight(): void {
    for (const decision of this.decisionElements) {
      decision.showDecisionColor = false;
    }
  }

  private resetSpectrogramSettings(): void {
    for (const tile of this.gridTiles) {
      tile.spectrogram?.resetSettings();
    }
  }

  private async renderVirtualPage(nextPage: Verification[]): Promise<void> {
    const elements = this.gridTiles;

    if (elements === undefined || elements.length === 0) {
      throw new Error("Could not find instantiated spectrogram elements");
    }

    if (nextPage.length === 0) {
      this.spectrogramElements = this.noItemsTemplate();
      this.setDecisionDisabled(true);
    }

    nextPage.forEach((item: Verification, i: number) => {
      const target = elements[i];

      target.model = item;
      target.index = i;
    });

    // if we are on the last page, we hide the remaining elements
    const pagedDelta = elements.length - nextPage.length;
    if (pagedDelta > 0) {
      this.hideGridItems(pagedDelta);
    } else {
      this.showAllGridItems();
      this.hiddenTiles = 0;
    }

    this.cacheNext();
  }

  private hideGridItems(numberOfTiles: number): void {
    // TODO: improve this
    const elementsToHide = Array.from(this.gridTiles).slice(-numberOfTiles);

    elementsToHide.forEach((element) => {
      element.style.position = "absolute";
      element.style.opacity = "0";
    });

    this.hiddenTiles = numberOfTiles;
  }

  private showAllGridItems(): void {
    for (const element of this.gridTiles) {
      element.style.position = "inherit";
      element.style.opacity = "1";
    }
  }

  private async cacheClient(elapsedItems: number) {
    const page = await this.getPage(elapsedItems);

    if (page.length === 0) {
      return;
    }

    const verificationModels = page.map(VerificationParser.parse);
    await Promise.all(verificationModels.map((item) => fetch(item.url, { method: "GET" })));
  }

  private async cacheServer(targetElapsedItems: number) {
    while (this.serverCacheHead < targetElapsedItems) {
      const page = await this.getPage(this.serverCacheHead);

      if (page.length === 0) {
        this.serverCacheExhausted = true;
        return;
      }

      const verificationModels = page.map(VerificationParser.parse);
      Promise.all(verificationModels.map((item) => fetch(item.url, { method: "HEAD" })));

      this.serverCacheHead += page.length;
    }
  }

  private cacheNext() {
    // start caching client side from the start of the next page
    const pagesToClientCache = this.pagedItems + this.gridSize;

    const PagesToCacheServerSide = 10;
    const targetServerCacheHead = pagesToClientCache + this.gridSize * PagesToCacheServerSide;

    this.cacheClient(pagesToClientCache);
    if (!this.serverCacheExhausted) {
      this.cacheServer(targetServerCacheHead);
    }
  }

  private areSpectrogramsLoaded(): boolean {
    const gridTilesArray = Array.from(this.gridTiles);
    return !gridTilesArray.some((tile: VerificationGridTile) => !tile.loaded);
  }

  private handleSpectrogramLoaded(): void {
    const areDecisionsDisabled = this.decisionElements[0].disabled;
    const areLoading = !this.areSpectrogramsLoaded();

    if (areDecisionsDisabled !== areLoading) {
      this.setDecisionDisabled(areLoading);
    }
  }

  private setDecisionDisabled(disabled: boolean): void {
    this.decisionElements.forEach((decisionElement: Decision) => {
      decisionElement.disabled = disabled;
    });
  }

  private createSpectrogramElements() {
    // we use a buffer so that the entire component doesn't re-render
    // every time that we add a spectrogram element
    const verificationGridBuffer = [];

    // TODO: we might be able to do partial rendering or removal if some of the
    // TODO: we might be able to set the OE verification model when creating the elements
    // needed spectrogram elements already exist
    for (let i = 0; i < this.gridSize; i++) {
      // TODO: see if we can get rid of the type override here
      const template = this.gridItemTemplate.content.cloneNode(true) as HTMLElement;
      verificationGridBuffer.push(
        html`<oe-verification-grid-tile @loaded="${this.handleSpectrogramLoaded}">
          ${template}
        </oe-verification-grid-tile>`,
      );
    }

    this.spectrogramElements = verificationGridBuffer;
  }

  private doneRenderBoxInit = false;
  private renderHighlightBox(event: PointerEvent) {
    if (!this.canSubSelect()) {
      return;
    }

    if (event.isPrimary) {
      // TODO: enable this once I want highlighting again
      this.highlighting = true;

      const element = this.shadowRoot!.getElementById("highlight-box");
      if (!element) {
        return;
      }

      if (!this.doneRenderBoxInit) {
        // const intersectionObserver = new IntersectionObserver((event) => this.highlightIntersectionHandler(event));
        // intersectionObserver.observe(element);

        this.gridTiles.forEach((tile) => {
          this.highlight.elements.push({
            position: tile.getBoundingClientRect(),
            element: tile,
          });
        });

        this.doneRenderBoxInit = true;
      }

      element.style.display = "block";
      element.style.left = `${event.pageX}px`;
      element.style.top = `${event.pageY}px`;

      this.highlight.start = { x: event.pageX, y: event.pageY };
    }
  }

  private resizeHighlightBox(event: PointerEvent) {
    if (!this.highlighting) {
      return;
    }

    const element = this.shadowRoot!.getElementById("highlight-box");
    if (!element) {
      return;
    }

    const { pageX, pageY } = event;
    this.highlight.current = { x: pageX, y: pageY };

    const highlightWidth = this.highlight.current.x - this.highlight.start.x;
    const highlightHeight = this.highlight.current.y - this.highlight.start.y;

    element.style.width = `${Math.abs(highlightWidth)}px`;
    element.style.height = `${Math.abs(highlightHeight)}px`;

    if (highlightWidth < 0) {
      element.style.left = `${pageX}px`;
    }

    if (highlightHeight < 0) {
      element.style.top = `${pageY}px`;
    }

    this.calculateHighlightIntersection();
  }

  private calculateHighlightIntersection(): void {
    const xMin = Math.min(this.highlight.start.x, this.highlight.current.x);
    const xMax = Math.max(this.highlight.start.x, this.highlight.current.x);
    const yMin = Math.min(this.highlight.start.y, this.highlight.current.y);
    const yMax = Math.max(this.highlight.start.y, this.highlight.current.y);

    for (const element of this.highlight.elements) {
      const { top, bottom, left, right } = element.position;

      const selectedElement = element.element as VerificationGridTile;
      if (left <= xMax && right >= xMin && top <= yMax && bottom >= yMin) {
        selectedElement.selected = true;
      } else {
        selectedElement.selected = false;
      }
    }

    this.requestUpdate();
  }

  private hideHighlightBox(): void {
    this.highlighting = false;
    const element = this.shadowRoot!.getElementById("highlight-box");
    if (!element) {
      return;
    }

    console.log("stop highlight");

    // TODO: make this better
    element.style.width = "0px";
    element.style.height = "0px";
    element.style.top = "0px";
    element.style.left = "0px";
    element.style.display = "none";
  }

  private canDownloadResults(): boolean {
    return this.decisions.length > 0;
  }

  // TODO: clean up this function
  // TODO: there is a "null" in additional tags (if none)
  private downloadResults(): void {
    if (!this.dataSource?.fileName) {
      throw new Error("No input data source found");
    }

    // since we do not know the input format of the provided csv or json files
    // it is possible for users to input a csv file that already has a column
    // header of "confirmed" or "additional-tags"
    // to prevent column name collision, we prepend all the fields that we add
    // to the original data input with "oe"
    const columnNamespace = "oe";

    let formattedResults = "";
    const fileFormat = this.dataSource?.fileType ?? "json";
    const results = this.decisions.map((decision: Verification) => {
      const subject = decision.subject;
      const tag = decision.tag?.text ?? "";
      const confirmed = decision.confirmed;
      const additionalTags = decision.additionalTags;

      return {
        ...subject,
        [`${columnNamespace}-tag`]: tag,
        [`${columnNamespace}-confirmed`]: confirmed,
        [`${columnNamespace}-additional-tags`]: additionalTags,
      };
    });

    if (fileFormat === "json") {
      formattedResults = JSON.stringify(results);
    } else if (fileFormat === "csv") {
      formattedResults = new Parser().parse(results);
    }

    const type = fileFormat === "json" ? "application/json" : "text/csv";
    const blob = new Blob([formattedResults], { type });
    const url = URL.createObjectURL(blob);

    // TODO: we should just be able to use the file download API
    // TODO: probably apply a transformation to arrays in CSVs (use semi-columns as item delimiters)
    const a = document.createElement("a");
    a.href = url;
    a.download = `verified-${this.dataSource.fileName}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private currentSubSelection(): Verification[] {
    const gridTiles = Array.from(this.gridTiles);
    return gridTiles.filter((tile) => tile.selected).map((tile) => tile.model);
  }

  private decisionPrompt(): TemplateResult<1> {
    const subSelection = this.currentSubSelection();
    const subSelectionCount = subSelection.length;
    const hasMultipleTiles = this.gridSize > 1;

    if (subSelectionCount > 0) {
      return html`<p>Are all of the selected ${subSelectionCount} a</p>`;
    }

    return html`<p>${hasMultipleTiles ? "Are all of these a" : "Is the shown spectrogram a"}</p>`;
  }

  private statisticsTemplate(): TemplateResult<1> {
    return html`
      <div class="statistics-section">
        <h2>Statistics</h2>
        <p><span>Validated Items</span>: ${this.pagedItems}</p>
      </div>
    `;
  }

  private noItemsTemplate(): TemplateResult<1> {
    return html`
      <div class="no-items-message">
        <p>
          <strong>No un-validated results found</strong>
        </p>
        <p>All ${this.pagedItems} annotations are validated</p>
      </div>
    `;
  }

  public render() {
    return html`
      <oe-verification-help-dialog></oe-verification-help-dialog>
      <div id="highlight-box" @mouseup="${this.hideHighlightBox}" @mousemove="${this.resizeHighlightBox}"></div>

      <div class="verification-container">
        <div
          @selected="${this.selectionHandler}"
          @pointerdown="${this.renderHighlightBox}"
          @pointerup="${this.hideHighlightBox}"
          @pointermove="${this.resizeHighlightBox}"
          class="verification-grid"
        >
          ${this.spectrogramElements}
        </div>

        <div class="verification-controls">
          <span class="decision-controls-left">
            <button @click="${() => this.helpDialog.showModal(false)}" class="oe-btn-info" rel="help">
              ${unsafeSVG(lucideCircleHelp)}
            </button>

            <button
              class="oe-btn oe-btn-secondary"
              ?disabled="${!this.canNavigatePrevious()}"
              @click="${() => this.previousPage()}"
            >
              ${this.gridSize > 1 ? "Previous Page" : "Previous"}
            </button>

            <button
              class="oe-btn-secondary ${classMap({ hidden: this.autoPage && !this.isViewingHistory() })}"
              ?disabled="${!this.canNavigateNext()}"
              @click="${() => this.handleNextPageClick()}"
            >
              ${this.gridSize > 1 ? "Next Page" : "Next"}
            </button>

            <button
              class="oe-btn-secondary ${classMap({ hidden: !this.isViewingHistory() })}"
              ?disabled="${!this.isViewingHistory()}"
              @click="${() => this.resumeVerification()}"
            >
              Continue Verifying
            </button>
          </span>

          <span class="decision-controls">
            <h2 class="verification-controls-title">${this.decisionPrompt()}</h2>
            <div class="decision-control-actions">
              <slot @decision="${this.catchDecision}"></slot>
            </div>
          </span>

          <span class="decision-controls-right">
            <slot name="data-source"></slot>
            <button @click="${this.downloadResults}" ?disabled="${!this.canDownloadResults()}" class="oe-btn-secondary">
              Download Results
            </button>
          </span>
        </div>
      </div>

      <div>${this.statisticsTemplate()}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-verification-grid": VerificationGrid;
  }
}
