import { customElement, property, query, queryAll, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, PropertyValueMap, TemplateResult, unsafeCSS } from "lit";
import verificationGridStyles from "./css/style.css?inline";
import { queryAllDeeplyAssignedElements, queryDeeplyAssignedElement } from "../../helpers/decorators";
import { Classification, DecisionWrapper } from "../../models/verification";
import { VerificationGridTileComponent } from "../verification-grid-tile/verification-grid-tile";
import { DecisionComponent, DecisionEvent } from "../decision/decision";
import { VerificationHelpDialogComponent } from "./help-dialog";
import { booleanConverter, callbackConverter } from "../../helpers/attributes";
import { sleep } from "../../helpers/utilities";
import { classMap } from "lit/directives/class-map.js";
import { GridPageFetcher, PageFetcher } from "../../services/gridPageFetcher";
import { ESCAPE_KEY, LEFT_ARROW_KEY, RIGHT_ARROW_KEY } from "../../helpers/keyboard";

export type SelectionObserverType = "desktop" | "tablet" | "default";

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
 * @description
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
 *   <oe-decision verified="true" additional-tags="female" shortcut="H">Koala</oe-decision>
 *   <oe-decision verified="true" additional-tags="male" shortcut="J">Koala</oe-decision>
 *   <oe-decision shortcut="S" skip>Skip</oe-decision>
 *   <oe-decision shortcut="S" unsure>Unsure</oe-decision>
 *
 *   <oe-data-source slot="data-source" for="verification-grid" src="/public/grid-items.json" local>
 *   </oe-data-source>
 * </oe-verification-grid>
 * ```
 *
 * @dependency oe-verification-grid-tile
 *
 * @slot - A template element that will be used to create each grid tile
 * @slot - Decision elements that will be used to create the decision buttons
 * @slot data-source - An `oe-data-source` element that provides the data
 *
 * @fires decision - Emits information about the decision that was made
 * @fires loaded - Emits when all the spectrograms have been loaded
 */
@customElement("oe-verification-grid")
export class VerificationGridComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(verificationGridStyles);
  private static loadedEventName = "loaded" as const;
  private static decisionMadeEventName = "decision-made" as const;

  /** The number of items to display in a single grid */
  @property({ attribute: "grid-size", type: Number, reflect: true })
  public gridSize = 8;

  /**
   * The selection behavior of the verification grid
   * @values "desktop" | "tablet" | "default"
   * @default "default"
   */
  @property({ attribute: "selection-behavior", type: String, reflect: true })
  public selectionBehavior: SelectionObserverType = "default";

  /** A callback function that returns a page of recordings */
  @property({ attribute: "get-page", type: Function, converter: callbackConverter as any })
  public getPage?: PageFetcher;

  /** Automatically advance to the next page after a decision is made */
  @property({ attribute: "auto-page", type: Boolean, converter: booleanConverter })
  public autoPage = true;

  /** Pre-fetch the next page of recordings */
  @property({ attribute: "pre-fetch", type: Boolean, converter: booleanConverter })
  public preFetch = true;

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

  @query("#grid-container")
  private gridContainer!: HTMLDivElement;

  @query("#decisions-container")
  private decisionsContainer!: HTMLSlotElement;

  @state()
  private currentSubSelection: DecisionWrapper[] = [];

  public get pagedItems(): number {
    return this.paginationFetcher?.pagedItems ?? 0;
  }

  private keydownHandler = this.handleKeyDown.bind(this);
  private keyupHandler = this.handleKeyUp.bind(this);
  private blurHandler = this.handleWindowBlur.bind(this);
  private intersectionHandler = this.handleIntersection.bind(this);
  private selectionHandler = this.handleSelection.bind(this);
  private decisionHandler = this.handleDecision.bind(this);
  private intersectionObserver = new IntersectionObserver(this.intersectionHandler);

  public decisions: DecisionWrapper[] = [];
  private undecidedTiles: DecisionWrapper[] = [];
  private hiddenTiles = 0;
  private decisionsDisabled = false;
  private showingSelectionShortcuts = false;
  private selectionHead: number | null = null;
  private doneRenderBoxInit = false;
  private highlight: HighlightSelection = {
    start: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    highlighting: false,
    elements: [],
  };

  private paginationFetcher?: GridPageFetcher;

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

    this.gridContainer.removeEventListener<any>("selected", this.selectionHandler);
    this.decisionsContainer.removeEventListener<any>("decision", this.decisionHandler);

    super.disconnectedCallback();
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
    this.gridContainer.addEventListener<any>("selected", this.selectionHandler);
    this.decisionsContainer.addEventListener<any>("decision", this.decisionHandler);
  }

  protected async updated(change: PropertyValueMap<this>): Promise<void> {
    const renderInvalidationKeys: (keyof this)[] = ["gridSize"];
    const sourceInvalidationKeys: (keyof this)[] = ["getPage"];
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
      selectionBehavior = this.isMobileDevice() ? "tablet" : "desktop";
    }

    // I store the decision elements inside a variable so that we don't have
    // to query the DOM every iteration of the loop
    const decisionElements = this.decisionElements ?? [];
    for (const element of decisionElements) {
      element.selectionMode = selectionBehavior;
    }

    this.helpDialog.selectionBehavior = selectionBehavior;
    this.helpDialog.decisionElements = decisionElements;

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
    this.decisions = [];

    if (this.getPage) {
      this.paginationFetcher = new GridPageFetcher(this.getPage);
      await this.renderCurrentPage();
    }

    const decisionElements = this.decisionElements;
    if (decisionElements) {
      decisionElements.forEach((element: DecisionComponent, i: number) => {
        element.decisionIndex = i;
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
      case ESCAPE_KEY: {
        this.removeSubSelection();

        if (!this.isViewingHistory()) {
          this.removeDecisionButtonHighlight();
        }
        break;
      }

      case LEFT_ARROW_KEY: {
        event.preventDefault();
        this.previousPage();
        break;
      }

      case RIGHT_ARROW_KEY: {
        event.preventDefault();
        this.pageForwardHistory();
        break;
      }

      case "?": {
        this.helpDialog.showModal(false);
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
    this.hideHighlightBox();
  }

  private handleHelpDialogOpen(): void {
    this.gridContainer.removeEventListener<any>("selected", this.selectionHandler);
    this.decisionsContainer.removeEventListener<any>("decision", this.decisionHandler);
  }

  private handleHelpDialogClose(): void {
    this.gridContainer.addEventListener<any>("selected", this.selectionHandler);
    this.decisionsContainer.addEventListener<any>("decision", this.decisionHandler);
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
          this.hideGridItems(newProposedHiddenTiles);
        }
      }
    }
  }

  private handleSelection(selectionEvent: SelectionEvent): void {
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

    this.updateSubSelection();
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
    if (this.isMobileDevice()) {
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
    if (this.selectionBehavior === "tablet") {
      throw new Error("Attempted desktop selection when explicit tablet selection is specified");
    }

    const selectionIndex = selectionEvent.detail.index;

    // in desktop mode, unless the ctrl key is held down, clicking an element
    // removes all other selected items
    // while it is not possible to press the ctrl key on a tablet, the user can
    // still overwrite the selection behavior using the selection-behavior
    // attribute. Therefore, we have to check that we are not on explicitly
    // using tablet selection mode.
    if (!selectionEvent.detail.ctrlKey) {
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

    this.updateSubSelection();
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
    this.updateSubSelection();
  }

  private canSubSelect(): boolean {
    // we check that the help dialog is not open so that the user doesn't
    // accidentally create a sub-selection (e.g. through keyboard shortcuts)
    // when they can't actually see the grid items
    return this.gridSize > 1 && !this.isHelpDialogOpen();
  }

  private isMobileDevice(): boolean {
    // userAgentData is not shipped on all browsers. However, since we have
    // polyfilled the userAgentData object, this condition should always be true
    if (navigator.userAgentData) {
      return navigator.userAgentData.mobile;
    }

    // if this error is being thrown, the userAgentData polyfills are not
    // being applied
    throw new Error("Could not determine if the device is a touch device");
  }

  private updateSubSelection(): void {
    const gridTiles = Array.from(this.gridTiles);
    this.currentSubSelection = gridTiles.filter((tile) => tile.selected).map((tile) => tile.model);
  }

  //#endregion

  // TODO: The selection bounding box isn't currently complete
  //#region SelectionBoundingBox

  // TODO: Clean this up
  private renderHighlightBox(event: PointerEvent) {
    if (!this.canSubSelect() || this.isMobileDevice()) {
      return;
    }

    if (event.isPrimary) {
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

    this.updateSubSelection();
  }

  private hideHighlightBox(): void {
    if (!this.shadowRoot || this.isMobileDevice()) {
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

    this.historyMode(decisionHistory);
    this.renderVirtualPage(decisionHistory);
  }

  /**
   * @description
   * Change the verification grid to the "history mode" layout
   * Note: Changing to "History Mode" does not render the history. It is only
   *       responsible for changing the layout of the verification grid.
   */
  private historyMode(decisions: DecisionWrapper[]): void {
    if (this.decisions.length === 0) {
      throw new Error("No decisions to show in history");
    }

    // if the user has completed all their verifications, then all the grid
    // items would have been removed
    // therefore, we have to recreate these grid tiles before we can start
    // rendering history (if they are not present)
    if (!this.gridTiles || this.gridTiles.length === 0) {
      this.createSpectrogramElements();

      // TODO: forcing a synchronous update is hacky, and we should definitely remove it
      this.performUpdate();
    }

    const touchedDecisionElements = this.touchedDecisionElements();
    this.showDecisionButtonHighlight(touchedDecisionElements);
    this.createDecisionHighlight(decisions);
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
      this.nextPage(this.gridSize);
    }
  }

  private async nextPage(count: number): Promise<void> {
    this.removeSubSelection();
    this.removeDecisionHighlight();
    this.resetSpectrogramSettings();

    if (!this.paginationFetcher) {
      throw new Error("No paginator found.");
    }

    const nextPage = await this.paginationFetcher.popNextItems(count);
    const pageToRender = [...this.undecidedTiles, ...nextPage];
    this.renderVirtualPage(pageToRender);
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

  private async handleDecision(event: DecisionEvent) {
    // if the user is spamming a decision keyboard shortcut, it is possible for
    // them to create two decisions for one grid tile
    // this is a hack to prevent that
    // TODO: this is not guaranteed to work. We should find a better solution
    if (!this.isViewingHistory()) {
      this.setDecisionDisabled(true);
    }

    // if the dialog box is open, we don't want to catch events
    // because the user could accidentally create a decision by using the
    // decision keyboard shortcuts while the help dialog is open
    if (this.isHelpDialogOpen()) {
      return;
    }

    const classifications: Classification[] = event.detail.value;
    const decisionIndex = event.detail.target.decisionIndex;

    const gridTiles = Array.from(this.gridTiles);
    const subSelection = gridTiles.filter((tile) => tile.selected);
    const hasSubSelection = subSelection.length > 0;
    const trueSubSelection = hasSubSelection ? subSelection : gridTiles;

    const selectedTiles = trueSubSelection.filter((tile) => !tile.hidden);
    const selectedItems = selectedTiles.map((tile) => tile.model);

    const decisions: DecisionWrapper[] = selectedTiles.map(
      (tile: VerificationGridTileComponent) =>
        new DecisionWrapper({
          ...tile.model,
          decisions: classifications,
          origin: decisionIndex,
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
      this.createSelectionHighlight(selectedTiles, decisionIndex);

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
      this.createSelectionHighlight(selectedTiles, decisionIndex);

      // we wait for 300ms so that the user has time to see the decision that
      // they have made in the form of a decision highlight around the selected
      // grid tiles and the chosen decision button
      await sleep(0.3);
      this.nextPage(decisions.length);
    }
  }

  private setDecisionDisabled(disabled: boolean): void {
    const decisionElements = this.decisionElements ?? [];
    for (const decisionElement of decisionElements) {
      decisionElement.disabled = disabled;
    }

    this.decisionsDisabled = disabled;
  }

  //#endregion

  //#region DecisionHighlights

  private createSelectionHighlight(selectedTiles: VerificationGridTileComponent[], color: number): void {
    selectedTiles.forEach((tile: VerificationGridTileComponent, i: number) => {
      const derivedColor = Array.isArray(color) ? color[i] : color;
      tile.decisionIndex = derivedColor;
    });
  }

  private createDecisionHighlight(decisions: DecisionWrapper[]): void {
    decisions.forEach((decision: DecisionWrapper, i: number) => {
      const gridTile = this.gridTiles[i];
      gridTile.decisionIndex = decision.origin;
    });
  }

  private removeDecisionHighlight(selectedTiles: VerificationGridTileComponent[] = Array.from(this.gridTiles)): void {
    for (const tile of selectedTiles) {
      tile.decisionIndex = undefined;
    }

    this.removeDecisionButtonHighlight();
  }

  private touchedDecisionElements(): DecisionComponent[] {
    const decisionElements = this.decisionElements;
    if (!decisionElements) {
      throw new Error("No decision elements found");
    }

    return decisionElements.filter((element: DecisionComponent) =>
      this.decisions.some((decision) => decision.origin === element.decisionIndex),
    );
  }

  private showDecisionButtonHighlight(elements: DecisionComponent[]): void {
    for (const decision of elements) {
      decision.highlighted = true;
    }
  }

  private removeDecisionButtonHighlight(): void {
    const decisionElements = this.decisionElements ?? [];
    for (const decision of decisionElements) {
      decision.highlighted = false;
    }
  }

  //#endregion

  //#region Rendering

  private async renderCurrentPage(): Promise<void> {
    if (!this.paginationFetcher) {
      throw new Error("Pagination fetcher not found");
    }

    const pageItems = await this.paginationFetcher.currentPage();
    this.renderVirtualPage(pageItems);
  }

  private async renderVirtualPage(nextPage: DecisionWrapper[]): Promise<void> {
    const elements = this.gridTiles;
    if (elements === undefined || elements.length === 0) {
      throw new Error("Could not find instantiated spectrogram elements");
    }

    // even though making a decision will cause the spectrograms to load and
    // emit the "loading" event (causing the decision buttons to be disabled)
    // there can be some input lag between when we request to change the src
    // and when the spectrograms begin to start rendering
    // I also do this first so that if the functionality below fails then the
    // user can't continue making decisions that won't be saved when downloaded
    this.setDecisionDisabled(true);

    // if this guard condition is true, it means that we have exhausted the
    // entire data source provided by the getPage callback
    if (nextPage.length === 0) {
      this.spectrogramElements = this.noItemsTemplate();
      return;
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
  }

  private hideGridItems(numberOfTiles: number): void {
    Array.from(this.gridTiles)
      .slice(-numberOfTiles)
      .forEach((element) => {
        element.hidden = true;
      });

    this.hiddenTiles = numberOfTiles;
  }

  private showAllGridItems(): void {
    const gridTiles = this.gridTiles ?? [];
    for (const element of gridTiles) {
      element.hidden = false;
    }
  }

  private hasDecisionElements(): boolean {
    return Array.from(this.decisionElements ?? []).length > 0;
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
    const decisionsDisabled = this.decisionsDisabled;
    const loading = !this.areSpectrogramsLoaded();

    if (decisionsDisabled !== loading) {
      this.setDecisionDisabled(loading);
    }

    if (!loading) {
      this.dispatchEvent(new CustomEvent(VerificationGridComponent.loadedEventName));
    }
  }

  //#endregion

  //#region Templates

  private decisionPromptTemplate(): TemplateResult<1> {
    const subSelection = this.currentSubSelection;
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

  private noDecisionsTemplate(): TemplateResult<1> {
    return html`
      <strong class="no-decisions-warning">
        No decisions available.
      </strong>
    `;
  }

  public render() {
    return html`
      <oe-verification-help-dialog
        @open="${this.handleHelpDialogOpen}"
        @close="${this.handleHelpDialogClose}"
      ></oe-verification-help-dialog>
      <div id="highlight-box" @mouseup="${this.hideHighlightBox}" @mousemove="${this.resizeHighlightBox}"></div>

      <div class="verification-container">
        <div
          id="grid-container"
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
              <sl-icon name="question-circle" class="large-icon"></sl-icon>
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
            <h2 class="verification-controls-title">
              ${this.hasDecisionElements() ? this.decisionPromptTemplate() : this.noDecisionsTemplate()}
            </h2>
            <div class="decision-control-actions">
              <slot id="decisions-container"></slot>
            </div>
          </span>

          <span class="decision-controls-right">
            <slot name="data-source"></slot>
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
