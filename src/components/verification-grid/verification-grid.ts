import { customElement, property, query, queryAll, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, PropertyValueMap, TemplateResult, unsafeCSS } from "lit";
import verificationGridStyles from "./css/style.css?inline";
import { queryAllDeeplyAssignedElements, queryDeeplyAssignedElement } from "../../helpers/decorators";
import { Classification, DecisionWrapper, VerificationSubject } from "../../models/verification";
import { VerificationGridTileComponent } from "../verification-grid-tile/verification-grid-tile";
import { DecisionComponent, DecisionEvent } from "../decision/decision";
import { Parser } from "@json2csv/plainjs";
import { VerificationParser } from "../../services/verificationParser";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import lucideCircleHelp from "lucide-static/icons/circle-help.svg?raw";
import { VerificationHelpDialogComponent } from "./help-dialog";
import colorBrewer from "colorbrewer";
import { booleanConverter, callbackConverter } from "../../helpers/attributes";
import { sleep } from "../../helpers/utilities";
import { classMap } from "lit/directives/class-map.js";
import { DataSourceComponent } from "data-source/data-source";
import { Color } from "../../helpers/audio/colors";

export type SelectionObserverType = "desktop" | "tablet" | "default";
export type PageFetcher = (elapsedItems: number) => Promise<VerificationSubject[]>;

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
 * A verification grid component that can be used to verify audio events
 *
 * @example
 * ```html
 * <oe-verification-grid gridSize="10">
 *   <template>
 *     <oe-axes>
 *        <oe-indicator>
 *          <oe-spectrogram id="spectrogram" color-map="audacity" scaling="stretch"></oe-spectrogram>
 *        </oe-indicator>
 *     </oe-axes>
 *   </template>
 *
 *   <oe-data-source slot="data-source" for="verification-grid" src="/public/grid-items.json" local>
 *   </oe-data-source>
 * </oe-verification-grid>
 * ```
 *
 * @property paged-items - The number of items that have been paged
 * @property grid-size - The number of items to display in a single grid
 * @property selection-behavior {desktop | tablet}
 * @property get-page - A callback function that returns a page of recordings
 * @property auto-page - Automatically page forward when a decision is made
 * @property pre-fetch - Pre-fetch the next page of recordings
 *
 * @slot - A template element that will be used to create each grid tile
 * @slot data-source - An `oe-data-source` element that provides the data
 *
 * @fires decision-made - Emits information about the decision that was made
 * @fires loaded - Emits when all the spectrograms have been loaded
 */
@customElement("oe-verification-grid")
export class VerificationGridComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(verificationGridStyles);
  private static loadedEventName = "loaded" as const;
  private static decisionMadeEventName = "decision-made" as const;

  // we use pagedItems instead of page here so that if the grid size changes
  // half way through, we can continue verifying from where it left off
  @property({ attribute: "paged-items", type: Number, reflect: true })
  public pagedItems = 0;

  @property({ attribute: "grid-size", type: Number, reflect: true })
  public gridSize = 8;

  @property({ attribute: "selection-behavior", type: String, reflect: true })
  public selectionBehavior: SelectionObserverType = "default";

  @property({ attribute: "get-page", type: Function, converter: callbackConverter as any })
  public getPage?: PageFetcher;

  @property({ attribute: "auto-page", type: Boolean, converter: booleanConverter })
  public autoPage = true;

  @property({ attribute: "pre-fetch", type: Boolean, converter: booleanConverter })
  public preFetch = true;

  @property({ attribute: false })
  public dataSource?: DataSourceComponent;

  @state()
  private spectrogramElements?: TemplateResult<1> | TemplateResult<1>[];

  @state()
  private historyHead = 0;

  @queryAllDeeplyAssignedElements({ selector: "oe-decision" })
  private decisionElements?: DecisionComponent[];

  @queryDeeplyAssignedElement({ selector: "template" })
  private gridItemTemplate!: HTMLTemplateElement;

  @queryAll("oe-verification-grid-tile")
  private gridTiles!: NodeListOf<VerificationGridTileComponent>;

  @query("oe-verification-help-dialog")
  private helpDialog!: VerificationHelpDialogComponent;

  private keydownHandler = this.handleKeyDown.bind(this);
  private keyupHandler = this.handleKeyUp.bind(this);
  private blurHandler = this.handleWindowBlur.bind(this);
  private intersectionHandler = this.handleIntersection.bind(this);
  private intersectionObserver = new IntersectionObserver(this.intersectionHandler);

  private decisions: DecisionWrapper[] = [];
  private undecidedTiles: DecisionWrapper[] = [];
  private hiddenTiles = 0;
  private showingSelectionShortcuts = false;
  private selectionHead: number | null = null;
  private serverCacheHead = this.gridSize;
  private serverCacheExhausted = false;
  private doneRenderBoxInit = false;
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

  public currentSubSelection(): DecisionWrapper[] {
    const gridTiles = Array.from(this.gridTiles);
    return gridTiles.filter((tile) => tile.selected).map((tile) => tile.model);
  }

  public isViewingHistory(): boolean {
    return this.historyHead !== 0;
  }

  public resetSpectrogramSettings(): void {
    for (const tile of this.gridTiles) {
      tile.resetSettings();
    }
  }

  public isHelpDialogOpen(): boolean {
    return this.helpDialog.open;
  }

  // to use regions in VSCode, press Ctrl + Shift + P > "Fold"/"Unfold"
  //#region Updates

  public firstUpdated(): void {
    // this is a warning and not an error because while creating a verification
    // grid without any decisions is not useful, it should be supported and
    // possible to view without any errors being thrown
    if (this.decisionElements) {
      this.helpDialog.decisionElements = this.decisionElements;
    } else {
      console.warn("No decision elements found! Please add oe-decision elements to the verification grid");
    }
  }

  protected async updated(change: PropertyValueMap<this>): Promise<void> {
    const renderInvalidationKeys: (keyof this)[] = ["gridSize"];
    const sourceInvalidationKeys: (keyof this)[] = ["getPage", "dataSource"];
    const tileInvalidationKeys: (keyof this)[] = ["selectionBehavior"];

    // tile invalidations cause the functionality of the tiles to change
    // however, they do not cause the spectrograms or the template to render
    if (tileInvalidationKeys.some((key) => change.has(key))) {
      this.handleTileInvalidation();
    }

    // invalidating the source will cause the grid tiles and spectrogram to
    // invalidate meaning that each grid tile will re-render, however
    // they will not be re-created
    if (sourceInvalidationKeys.some((key) => change.has(key))) {
      await this.handleSourceInvalidation();
    }

    // a full render invalidation causes all the grid tiles elements to be
    // destroyed and re-created. This should always be a last resort
    if (renderInvalidationKeys.some((key) => change.has(key))) {
      this.handleRenderInvalidation();
    }
  }

  private handleTileInvalidation(): void {
    // if the user doesn't explicitly define a "selection-behavior" attribute
    // then we will infer the selection behavior based on the device type
    let selectionBehavior = this.selectionBehavior;
    if (selectionBehavior === "default") {
      selectionBehavior = this.isTouchDevice() ? "tablet" : "desktop";
    }

    // I store the decision elements inside a variable so that we don't have
    // to query the DOM every iteration of the loop
    const decisionElements = this.decisionElements ?? [];
    for (const element of decisionElements) {
      element.selectionMode = selectionBehavior;
    }

    this.helpDialog.selectionBehavior = selectionBehavior;

    // we remove the current sub-selection last so that if the change fails
    // there will be no feedback to the user that the operation succeeded
    this.removeSubSelection();
  }

  private async handleSourceInvalidation(): Promise<void> {
    // if the user is in the middle of viewing history when they load a new
    // verification file, we want to change back to the default verification
    // interface don't show any decision highlights, etc...
    if (!this.isViewingHistory()) {
      this.verificationMode();
    }
    this.pagedItems = 0;
    this.decisions = [];

    if (this.getPage) {
      await this.renderCurrentPage();
    }

    const decisionElements = this.decisionElements;
    if (decisionElements) {
      const colorLength = 12;
      const colors = colorBrewer.Paired[colorLength];

      decisionElements.forEach((element: DecisionComponent, i: number) => {
        // because colorBrewer only provides twelve colors, it is possible to
        // have more decisions than colors
        // to get around this, we modulo the index by the number of colors
        // so that the colors will repeat from the beginning if there are more
        // than eight colors
        const color = colors[i % colorLength];
        element.color = color;
      });
    }
  }

  private handleRenderInvalidation(): void {
    this.createSpectrogramElements();
  }

  //#endregion

  //#region EventHandlers
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.canSubSelect()) {
      return;
    }

    if (event.altKey) {
      // showing/hiding selection shortcuts is quite expensive because it
      // requires DOM queries
      if (!this.showingSelectionShortcuts) {
        this.showSelectionShortcuts();
      }

      // return early here because otherwise ctrl + alt + a would select all items
      // when the expected behavior is to add item a to the sub selection
      return;
    }

    if (event.ctrlKey && event.key === "a") {
      this.subSelectAll();
      // we return early after every keyboard shortcut because we know that
      // we can't trigger multiple keyboard shortcuts at the same time
      // e.g. You can't press ctrl + A and escape to select and deselect
      // by returning early we save computing erroneous keyboard shortcuts
      return;
    }

    switch (event.key) {
      case "Escape": {
        this.removeSubSelection();
        break;
      }

      case "ArrowLeft": {
        event.preventDefault();
        this.previousPage();
        break;
      }

      case "ArrowRight": {
        event.preventDefault();
        this.pageForwardHistory();
        break;
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // use preventDefault() so when the user presses alt because on FireFox
    // the menu bar is not shown and the hamburger menu isn't focused on Chrome
    if (event.altKey) {
      event.preventDefault();
      return;
    }

    // because we returned early if the alt key is pressed, we know that the
    // alt key is not being held down. The guard condition is therefore
    // if (this.showingSelectionShortcuts && !event.altKey) {
    if (this.showingSelectionShortcuts) {
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
  }

  //#endregion

  //#region SelectionHandlers

  private tileSelectionShortcutsShown(value: boolean) {
    const elements = this.gridTiles;
    for (const element of elements) {
      element.showKeyboardShortcuts = value;
    }
  }

  // showing and hiding selection shortcuts are two different functions to
  // follow defensive programming principles. So that if showing the selection
  // shortcuts fails, the grids internal state representation is not update if
  // we fail to hide all (but is set if we fail to show all)
  private showSelectionShortcuts(): void {
    this.showingSelectionShortcuts = true;
    this.tileSelectionShortcutsShown(true);
  }

  private hideSelectionShortcuts(): void {
    this.tileSelectionShortcutsShown(false);
    this.showingSelectionShortcuts = false;
  }

  // TODO: this functionality is not implemented correctly
  // I have disabled the intersection observer for now until I find the time
  // to create a correct solution
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

    // TODO: this should probably be replaced with some sort of @state decorator
    this.requestUpdate();
  }

  // TODO: this should be refactored out to a getter. The getter should return
  // tablet or desktop based on the device type when default is being used
  /**
   * @description
   * The default selection handler will infer the device type and
   * the selection behavior will be set to "tablet", otherwise it will be set
   * to "desktop"
   */
  private handleDefaultSelection(selectionEvent: SelectionEvent): void {
    if (this.isTouchDevice()) {
      this.handleTabletSelection(selectionEvent);
    } else {
      this.handleDesktopSelection(selectionEvent);
    }
  }

  /**
   * @description
   * Click                  Select a single tile (de-selecting any other items)
   * Shift + click          Select a range of tiles (de-selecting any other items)
   * Ctrl + click           Toggles the selection state of a single tile (not effecting other tiles)
   * Ctrl + Shift + click   Select a range of tiles (not effecting other tiles)
   */
  private handleDesktopSelection(selectionEvent: SelectionEvent): void {
    const selectionIndex = selectionEvent.detail.index;

    // in desktop mode, unless the ctrl key is held down, clicking an element
    // removes all other selected items
    // while it is not possible to press the ctrl key on a tablet, the user can
    // still overwrite the selection behavior using the selection-behavior
    // attribute. Therefore, we have to check that we are not on explicitly
    // using tablet selection mode.
    if (!selectionEvent.detail.ctrlKey && this.selectionBehavior !== "tablet") {
      this.removeSubSelection();
    }

    // there are two different types of selections, range selection and single selection
    // if the shift key is held down, then we perform a "range" selection, if not
    // then we should perform a single selection
    if (selectionEvent.detail.shiftKey) {
      // if the user has never selected an item before, the multiSelectHead will be "null"
      // in this case, we want to start selecting from the clicked tile
      this.selectionHead ??= selectionIndex;
      const selectionTail = selectionIndex;

      this.addSubSelectionRange(this.selectionHead, selectionTail);
      return;
    }

    // if we reach this point, we know that the user is not performing a
    // range selection because range selection performs an early return
    this.toggleTileSelection(selectionIndex);
    this.selectionHead = selectionIndex;
  }

  private handleTabletSelection(selectionEvent: SelectionEvent): void {
    this.toggleTileSelection(selectionEvent.detail.index);
  }

  private toggleTileSelection(index: number): void {
    const gridItems = this.gridTiles;
    gridItems[index].selected = !gridItems[index].selected;
  }

  private addSubSelectionRange(start: number, end: number): void {
    // if the user shift + clicks in a negative direction
    // e.g. select item 5 and then shift click item 2
    // we want to select all items from 2 to 5. Therefore, we swap the start and end values
    if (end < start) {
      [start, end] = [end, start];
    }

    // we don't have to cast the gridTiles to an array because we can index
    // into a NodeList of grid items without having an iterator
    const gridItems = this.gridTiles;
    for (let i = start; i <= end; i++) {
      gridItems[i].selected = true;
    }
  }

  private subSelectAll(): void {
    const elements = this.gridTiles;
    for (const element of elements) {
      element.selected = true;
    }

    this.requestUpdate();
  }

  private removeSubSelection(): void {
    // we set elements as a variable because this.gridTiles uses a query selector
    // therefore, if we put it inside the for loop, we would be doing a DOM query
    // every cycle
    const elements = this.gridTiles;
    for (const element of elements) {
      element.selected = false;
    }

    // TODO: I used to remove subSelection for a reason, but it doesn't seem to be needed
    // by setting the subSelection head to null, it means that if the user
    // shift clicks, it will be the start of a shift selection range
    // this.selectionHead = null;
    this.requestUpdate();
  }

  private canSubSelect(): boolean {
    // we check that the help dialog is not open so that the user doesn't
    // accidentally create a sub-selection (e.g. through keyboard shortcuts)
    // when they can't actually see the grid items
    return this.gridSize > 1 && !this.isHelpDialogOpen();
  }

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

  //#endregion

  // TODO: The selection bounding box isn't currently complete
  //#region SelectionBoundingBox

  // TODO: Clean this up
  private renderHighlightBox(event: PointerEvent) {
    if (!this.canSubSelect()) {
      return;
    }

    if (event.isPrimary) {
      // TODO: enable this once I want highlighting again
      this.highlight.highlighting = true;

      if (!this.shadowRoot) {
        return;
      }

      const element = this.shadowRoot.getElementById("highlight-box");
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
    if (!this.highlight.highlighting) {
      return;
    }

    if (!this.shadowRoot) {
      return;
    }

    const element = this.shadowRoot.getElementById("highlight-box");
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

      const selectedElement = element.element as VerificationGridTileComponent;
      if (left <= xMax && right >= xMin && top <= yMax && bottom >= yMin) {
        selectedElement.selected = true;
      } else {
        selectedElement.selected = false;
      }
    }

    this.requestUpdate();
  }

  private hideHighlightBox(): void {
    if (!this.shadowRoot) {
      return;
    }

    this.highlight.highlighting = false;

    const element = this.shadowRoot.getElementById("highlight-box");
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

  //#endregion

  //#region Navigation

  private previousPage(): void {
    if (this.canNavigatePrevious()) {
      this.historyHead += this.gridSize;
      this.renderHistory(this.historyHead);
    }
  }

  private pageForwardHistory(): void {
    if (this.canNavigateNext()) {
      this.historyHead -= this.gridSize;
      this.renderHistory(this.historyHead);
    }
  }

  private renderHistory(historyOffset: number) {
    const decisionStart = Math.max(0, this.decisions.length - historyOffset);
    const decisionEnd = Math.min(this.decisions.length, decisionStart + this.gridSize);

    const decisionHistory = this.decisions.slice(decisionStart, decisionEnd);
    this.renderVirtualPage(decisionHistory);
    this.historyMode(decisionHistory);
  }

  /**
   * @description
   * Change the verification grid to the "history mode" layout
   * Note: Changing to "History Mode" does not render the history. It is only
   *       responsible for changing the layout of the verification grid.
   */
  private historyMode(decisions: DecisionWrapper[]): void {
    // TODO: move this into the decision highlight code region
    decisions.forEach((decision: DecisionWrapper, i: number) => {
      const color = this.decisionColor(decision);
      this.gridTiles[i].borderColor = color;
    });

    // TODO: this should only show the touched decision elements for the
    // grid tiles shown on the current page
    const touchedDecisionElements = this.touchedDecisionElements();
    this.showDecisionButtonHighlight(touchedDecisionElements);
  }

  /**
   * @description
   * Change the verification grid to the "normal mode" layout
   * Note: Changing to "Verification Mode" does not stop rendering history
   *       responsible for changing the layout of the verification grid.
   */
  private verificationMode(): void {
    this.removeSubSelection();
    this.removeDecisionHighlight();
    this.removeDecisionButtonHighlight();
    this.historyHead = 0;
  }

  /**
   * @description
   * Changes to the "verification mode" and renders the
   */
  private resumeVerification(): void {
    this.renderCurrentPage();
    this.verificationMode();
  }

  private handleNextPageClick(): void {
    if (this.isViewingHistory()) {
      this.pageForwardHistory();
    } else {
      this.nextPage();
    }
  }

  private async nextPage(pagedItems: number = this.gridSize): Promise<void> {
    this.removeSubSelection();
    this.removeDecisionHighlight();
    this.resetSpectrogramSettings();

    if (!this.getPage) {
      throw new Error("No getPage method found.");
    }

    const nextPageIndex = this.pagedItems + pagedItems;
    const nextPage = await this.getPage(nextPageIndex);
    const nextVerificationModels = nextPage.map(VerificationParser.parse);

    // get all verification models that are not in the undecided tiles
    const undecidedSubjects = this.undecidedTiles.map((tile: DecisionWrapper) => tile.subject);
    const decisionSubjects = this.decisions.map((decision: DecisionWrapper) => decision.subject);

    const newVerificationModels = nextVerificationModels.filter(
      (model: DecisionWrapper) =>
        !undecidedSubjects.some((subject) => JSON.stringify(model.subject) === JSON.stringify(subject)) &&
        !decisionSubjects.some((subject) => JSON.stringify(model.subject) === JSON.stringify(subject)),
    );

    const pageToRender = [...this.undecidedTiles, ...newVerificationModels];
    this.renderVirtualPage(pageToRender);

    // we update the paged-items attribute last for two reasons
    // 1. Any external applications that are watching this attribute won't
    //    incorrectly think that the next page has been rendered before it has
    // 2. If we fail to render the next page (e.g. the render function errors)
    //    we want to retry rendering the page if the user presses clicks the
    //    next page button
    this.pagedItems = nextPageIndex;
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

  //#endregion

  //#region Decisions

  private async catchDecision(event: DecisionEvent) {
    // if the dialog box is open, we don't want to catch events
    // because the user could accidentally create a decision by using the
    // decision keyboard shortcuts while the help dialog is open
    if (this.isHelpDialogOpen()) {
      return;
    }

    // even though making a decision will cause the spectrograms to load and
    // emit the "loading" event (causing the decision buttons to be disabled)
    // there can be some input lag between the decision being made and when the
    // spectrograms begin to start rendering
    // I also do this first so that if the functionality below fails then the
    // user can't continue making decisions that won't be saved when downloaded
    // however, because the spectrogram won't reload when viewing history
    // we should not disable the decision buttons when viewing history
    if (!this.isViewingHistory()) {
      this.setDecisionDisabled(true);
    }

    const classifications: Classification[] = event.detail.value;
    const decisionColor: Color = event.detail.target.color;

    const gridTiles = Array.from(this.gridTiles);
    const subSelection = gridTiles.filter((tile) => tile.selected);
    const hasSubSelection = subSelection.length > 0;

    const selectedTiles = hasSubSelection ? subSelection : gridTiles;
    const selectedItems = selectedTiles.map((tile) => tile.model);

    const decisions: DecisionWrapper[] = selectedTiles.map(
      (tile: VerificationGridTileComponent) =>
        new DecisionWrapper({
          ...tile.model,
          decisions: classifications,
        }),
    );

    // if the user created a sub-selection, then all the tiles that are not
    // selected are "undecided", and a verification tag hasn't been added to it
    // in this case, we want to show it on the subsequent screens until they
    // make a decision
    this.undecidedTiles = [];
    if (hasSubSelection) {
      this.undecidedTiles = gridTiles
        .filter((tile: VerificationGridTileComponent) => !subSelection.includes(tile))
        .map((tile: VerificationGridTileComponent) => tile.model);
    }

    if (this.isViewingHistory()) {
      // when viewing history, we don't want to add the decision to the history
      // we want to update the decision that was made
      const decisionsToUpdate = this.decisions.filter((decision: DecisionWrapper) =>
        selectedItems.some((item: DecisionWrapper) => item.url === decision.url),
      );

      decisionsToUpdate.forEach((historicalDecision: DecisionWrapper) => {
        historicalDecision.decisions = classifications;
      });

      // we have updated the decision about a tiles while viewing history
      // therefore, there will be an already existing outline around the
      // grid tile that we need to update
      this.createDecisionHighlight(selectedTiles, decisionColor);

      this.removeDecisionButtonHighlight();
      this.showDecisionButtonHighlight([event.detail.target]);

      // by returning early, we prevent the decision from being added to the
      // history and do not page forward
      return;
    }

    // if we are in the normal paging scenario, we want to add the decision to
    // the decision history as a new decision
    this.decisions.push(...decisions);
    this.dispatchEvent(new CustomEvent(VerificationGridComponent.decisionMadeEventName, { detail: decisions }));

    if (this.autoPage) {
      this.showDecisionButtonHighlight([event.target as any]);
      this.createDecisionHighlight(selectedTiles, decisionColor);

      // we wait for 300ms so that the user has time to see the decision that
      // they have made in the form of a decision highlight around the selected
      // grid tiles and the chosen decision button
      await sleep(300);
      this.removeDecisionHighlight(selectedTiles);

      this.nextPage(decisions.length);
    }
  }

  private setDecisionDisabled(disabled: boolean): void {
    const decisionElements = this.decisionElements ?? [];
    for (const decisionElement of decisionElements) {
      decisionElement.disabled = disabled;
    }
  }

  //#endregion

  //#region DecisionHighlights

  private decisionColor(verification: DecisionWrapper): string {
    // TODO: this is really slow, we should probably optimize it
    const decisionElements = this.decisionElements ?? [];
    const decisionButton = decisionElements.find((element: DecisionComponent) => {
      const verificationDecisions = verification.decisions;
      const elementModels = element.classificationModels();
      return JSON.stringify(verificationDecisions) === JSON.stringify(elementModels);
    });

    if (!decisionButton) {
      throw new Error("Could not find color to match decision");
    }

    return decisionButton.color;
  }

  private createDecisionHighlight(selectedTiles: VerificationGridTileComponent[], color: string | string[]): void {
    selectedTiles.forEach((tile: VerificationGridTileComponent, i: number) => {
      const derivedColor = Array.isArray(color) ? color[i] : color;
      tile.borderColor = derivedColor;
    });
  }

  private removeDecisionHighlight(selectedTiles: VerificationGridTileComponent[] = Array.from(this.gridTiles)): void {
    for (const tile of selectedTiles) {
      tile.borderColor = "var(--oe-panel-color)";
    }

    this.removeDecisionButtonHighlight();
  }

  private touchedDecisionElements(): DecisionComponent[] {
    // TODO: this is really inefficient. We should improve the perf and quality
    const decisionElements = this.decisionElements ?? [];
    return decisionElements.filter((element: DecisionComponent) => {
      const possibleDecisions = element.classificationModels();
      return this.decisions.some((decision: DecisionWrapper) => {
        return JSON.stringify(decision.decisions) === JSON.stringify(possibleDecisions);
      });
    });
  }

  private areDecisionsDisabled(): boolean {
    const decisionElements = this.decisionElements ?? [];
    return decisionElements[0].disabled;
  }

  private showDecisionButtonHighlight(elements: DecisionComponent[]): void {
    for (const decision of elements) {
      decision.showDecisionColor = true;
    }
  }

  private removeDecisionButtonHighlight(): void {
    const decisionElements = this.decisionElements ?? [];
    for (const decision of decisionElements) {
      decision.showDecisionColor = false;
    }
  }

  //#endregion

  //#region Rendering

  private async renderCurrentPage(): Promise<void> {
    if (!this.getPage) {
      throw new Error("No getPage method found");
    }

    const firstPage = await this.getPage(this.pagedItems);
    const verificationModels = firstPage.map(VerificationParser.parse);
    this.renderVirtualPage(verificationModels);
  }

  private async renderVirtualPage(nextPage: DecisionWrapper[]): Promise<void> {
    const elements = this.gridTiles;
    if (elements === undefined || elements.length === 0) {
      throw new Error("Could not find instantiated spectrogram elements");
    }

    // if this guard condition is true, it means that we have exhausted the
    // entire data source provided by the getPage callback
    if (nextPage.length === 0) {
      this.spectrogramElements = this.noItemsTemplate();
      this.setDecisionDisabled(true);
    }

    nextPage.forEach((item: DecisionWrapper, i: number) => {
      const tile = elements[i];

      // on the initial render, the targets model will be undefined
      const currentTargetUrl = tile.model?.url ?? "";
      const newTargetUrl = item.url;

      // we can't directly compare the two objects because their strict equality
      // will always fail because it will be comparing two different memory
      // addresses. To prevent each tile re-rendering, we can selectively
      // re-render only he tiles which have changed sources
      if (currentTargetUrl !== newTargetUrl) {
        tile.model = item;
        tile.index = i;
      }
    });

    // if we are on the last page, we hide the remaining elements
    const pagedDelta = elements.length - nextPage.length;
    if (pagedDelta > 0) {
      this.hideGridItems(pagedDelta);
    } else if (this.hiddenTiles > 0) {
      this.showAllGridItems();
      this.hiddenTiles = 0;
    }

    this.cacheNext();
  }

  private hideGridItems(numberOfTiles: number): void {
    Array.from(this.gridTiles)
      .slice(-numberOfTiles)
      .forEach((element) => {
        element.style.position = "absolute";
        element.style.opacity = "0";
      });

    this.hiddenTiles = numberOfTiles;
  }

  private showAllGridItems(): void {
    const gridTiles = this.gridTiles ?? [];
    for (const element of gridTiles) {
      element.style.position = "inherit";
      element.style.opacity = "1";
    }
  }

  private createSpectrogramElements(): void {
    // we use a buffer so that the entire component doesn't re-render
    // every time that we add a spectrogram element
    const verificationGridBuffer = [];

    // TODO: we might be able to do partial rendering or removal if some of the
    // TODO: we might be able to set the OE verification model when creating the elements
    // needed spectrogram elements already exist
    for (let i = 0; i < this.gridSize; i++) {
      const template = this.gridItemTemplate.content.cloneNode(true);
      verificationGridBuffer.push(
        html`<oe-verification-grid-tile @loaded="${this.handleSpectrogramLoaded}">
          ${template}
        </oe-verification-grid-tile>`,
      );
    }

    this.spectrogramElements = verificationGridBuffer;

    // we store the grid tiles inside a const variable so that we don't have
    // to do a DOM query in every loop iteration
    const gridTiles = this.gridTiles ?? [];
    for (const element of gridTiles) {
      this.intersectionObserver.observe(element);
    }
  }

  private areSpectrogramsLoaded(): boolean {
    const gridTilesArray = Array.from(this.gridTiles);
    return !gridTilesArray.some((tile: VerificationGridTileComponent) => !tile.loaded);
  }

  private handleSpectrogramLoaded(): void {
    const decisionsDisabled = this.areDecisionsDisabled();
    const loading = !this.areSpectrogramsLoaded();

    if (decisionsDisabled !== loading) {
      this.setDecisionDisabled(loading);
    }

    if (!loading) {
      this.dispatchEvent(new CustomEvent(VerificationGridComponent.loadedEventName));
    }
  }

  //#endregion

  //#region Caching

  private async cacheClient(elapsedItems: number): Promise<void> {
    if (!this.preFetch || !this.getPage) {
      return;
    }

    const page = await this.getPage(elapsedItems);
    if (page.length === 0) {
      return;
    }

    const verificationModels = page.map(VerificationParser.parse);

    // we don't await the fetch requests because we want caching to be an
    // asynchronous operation that runs in the background while the spectrograms
    // are rendered
    for (const item of verificationModels) {
      fetch(item.url, { method: "GET" });
    }
    // await Promise.all(verificationModels.map((item) => fetch(item.url, { method: "GET" })));
  }

  private async cacheServer(targetElapsedItems: number) {
    if (!this.preFetch || !this.getPage) {
      return;
    }

    while (this.serverCacheHead < targetElapsedItems) {
      const page = await this.getPage(this.serverCacheHead);

      if (page.length === 0) {
        this.serverCacheExhausted = true;
        return;
      }

      const verificationModels = page.map(VerificationParser.parse);

      // the same as the client cache, we don't await the fetch requests
      // we do this so that caching requests don't block rendering
      for (const item of verificationModels) {
        fetch(item.url, { method: "HEAD" });
      }

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

  //#endregion

  //#region DownloadingResults

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

    const results = this.decisions.map((wrapper: DecisionWrapper) => {
      // because we have expended the verification models before, we know that
      // each decision will only have one item
      const decision = wrapper.decisions.at(0) as Classification;

      const subject = wrapper.subject;
      const tag = decision.tag?.text ?? "";
      const confirmed = decision.confirmed;
      const additionalTags = wrapper.additionalTags;

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
    } else if (fileFormat === "tsv") {
      formattedResults = new Parser({ delimiter: "\t" }).parse(results);
    }

    // create a media type as defined by e.g. application/json, text/csv, etc.
    // https://www.iana.org/assignments/media-types/media-types.xhtml
    const topLevelType = fileFormat === "json" ? "application" : "text";
    const mediaType = `${topLevelType}/${fileFormat}`;
    const blob = new Blob([formattedResults], { type: mediaType });
    const url = URL.createObjectURL(blob);

    // TODO: we should just be able to use the file download API
    // TODO: probably apply a transformation to arrays in CSVs (use semi-columns as item delimiters)
    const a = document.createElement("a");
    a.href = url;
    a.download = `verified-${this.dataSource.fileName}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  //#endregion

  //#region Templates

  private decisionPromptTemplate(): TemplateResult<1> {
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
            <button
              data-testid="help-dialog-button"
              @pointerdown="${() => this.helpDialog.showModal(false)}"
              class="oe-btn-info"
              rel="help"
            >
              ${unsafeSVG(lucideCircleHelp)}
            </button>

            <button
              data-testid="previous-page-button"
              class="oe-btn oe-btn-secondary"
              ?disabled="${!this.canNavigatePrevious()}"
              @pointerdown="${() => this.previousPage()}"
            >
              ${this.gridSize > 1 ? "Previous Page" : "Previous"}
            </button>

            <button
              data-testid="next-page-button"
              class="oe-btn-secondary ${classMap({ hidden: this.autoPage && !this.isViewingHistory() })}"
              ?disabled="${!this.canNavigateNext()}"
              @pointerdown="${() => this.handleNextPageClick()}"
            >
              ${this.gridSize > 1 ? "Next Page" : "Next"}
            </button>

            <button
              data-testid="continue-verifying-button"
              class="oe-btn-secondary ${classMap({ hidden: !this.isViewingHistory() })}"
              ?disabled="${!this.isViewingHistory()}"
              @pointerdown="${() => this.resumeVerification()}"
            >
              Continue Verifying
            </button>
          </span>

          <span class="decision-controls">
            <h2 class="verification-controls-title">${this.decisionPromptTemplate()}</h2>
            <div class="decision-control-actions">
              <slot @decision="${this.catchDecision}"></slot>
            </div>
          </span>

          <span class="decision-controls-right">
            <slot name="data-source"></slot>
            <button
              data-testid="download-results-button"
              class="oe-btn-secondary"
              @pointerdown="${this.downloadResults}"
              ?disabled="${!this.canDownloadResults()}"
            >
              Download Results
            </button>
          </span>
        </div>
      </div>

      <div>${this.statisticsTemplate()}</div>
    `;
  }

  //#endregion
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-verification-grid": VerificationGridComponent;
  }
}
