import { customElement, property, query, queryAll, queryAssignedElements, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, nothing, PropertyValueMap, PropertyValues, TemplateResult, unsafeCSS } from "lit";
import { VerificationGridTileComponent } from "../verification-grid-tile/verification-grid-tile";
import { DecisionComponent, DecisionComponentUnion, DecisionEvent } from "../decision/decision";
import { VerificationHelpDialogComponent } from "./help-dialog";
import { callbackConverter } from "../../helpers/attributes";
import { sleep } from "../../helpers/utilities";
import { classMap } from "lit/directives/class-map.js";
import { GridPageFetcher, PageFetcher } from "../../services/gridPageFetcher";
import { ESCAPE_KEY, LEFT_ARROW_KEY, RIGHT_ARROW_KEY } from "../../helpers/keyboard";
import { SubjectWrapper } from "../../models/subject";
import { ClassificationComponent } from "../decision/classification/classification";
import { VerificationComponent } from "../decision/verification/verification";
import { Decision } from "../../models/decisions/decision";
import { Tag } from "../../models/tag";
import { Verification } from "../../models/decisions/verification";
import { createContext, provide } from "@lit/context";
import { signal, Signal } from "@lit-labs/preact-signals";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { repeat } from "lit/directives/repeat.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { when } from "lit/directives/when.js";
import { hasCtrlLikeModifier } from "../../helpers/userAgent";
import { decisionColor } from "../../services/colors";
import verificationGridStyles from "./css/style.css?inline";

export type SelectionObserverType = "desktop" | "tablet" | "default";

export interface VerificationGridSettings {
  showAxes: Signal<boolean>;
  showMediaControls: Signal<boolean>;
  isFullscreen: Signal<boolean>;
}

export interface VerificationGridInjector {
  colorService: typeof decisionColor;
}

export interface MousePosition {
  x: number;
  y: number;
}

export const verificationGridContext = createContext<VerificationGridSettings>(Symbol("verification-grid-context"));
export const injectionContext = createContext<VerificationGridInjector>(Symbol("injection-context"));

type SelectionEvent = CustomEvent<{
  shiftKey: boolean;
  ctrlKey: boolean;
  index: number;
}>;

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
 *     <oe-info-card></oe-info-card>
 *   </template>
 *
 *   <oe-verification verified="true"></oe-verification>
 *   <oe-verification verified="false"></oe-verification>
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

  public static readonly decisionMadeEventName = "decision-made" as const;
  private static readonly loadedEventName = "loaded" as const;

  @provide({ context: verificationGridContext })
  @state()
  public settings: VerificationGridSettings = {
    showAxes: signal(true),
    showMediaControls: signal(true),
    isFullscreen: signal(false),
  };

  @provide({ context: injectionContext })
  @state()
  public injector: VerificationGridInjector = {
    colorService: decisionColor,
  };

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

  @state()
  private historyHead = 0;

  /** selector for oe-verification elements */
  @queryAssignedElements({ selector: "oe-verification" })
  private verificationDecisionElements!: VerificationComponent[];

  /** selector for oe-classification elements */
  @queryAssignedElements({ selector: "oe-classification" })
  private classificationDecisionElements!: ClassificationComponent[];

  @queryDeeplyAssignedElement({ selector: "template" })
  private gridItemTemplate?: HTMLTemplateElement;

  @queryAll("oe-verification-grid-tile")
  private gridTiles!: NodeListOf<VerificationGridTileComponent>;

  @query("oe-verification-help-dialog")
  private helpDialog!: VerificationHelpDialogComponent;

  @query("#grid-container")
  private gridContainer!: HTMLDivElement;

  @query("#decisions-container")
  private decisionsContainer!: HTMLSlotElement;

  @query("#skip-button")
  private skipButton!: DecisionComponent;

  @state()
  private currentSubSelection: SubjectWrapper[] = [];

  /** The array of subjects that are currently displayed in grid tiles */
  @state()
  public currentPage: SubjectWrapper[] = [];

  public get pagedItems(): number {
    return this.subjectHistory.length;
  }

  /** A computed selector for all oe-verification and oe-classification elements */
  public get decisionElements(): DecisionComponentUnion[] {
    return [...this.verificationDecisionElements, ...this.classificationDecisionElements];
  }

  private keydownHandler = this.handleKeyDown.bind(this);
  private keyupHandler = this.handleKeyUp.bind(this);
  private blurHandler = this.handleWindowBlur.bind(this);
  private intersectionHandler = this.handleIntersection.bind(this);
  private selectionHandler = this.handleSelection.bind(this);
  private decisionHandler = this.handleDecision.bind(this);
  private intersectionObserver = new IntersectionObserver(this.intersectionHandler);

  // the subject history contains all the subjects that have decisions applied
  // to them, while the verification buffer contains all the subjects that have
  // not yet been verified
  // TODO: these two buffers will be consolidated as part of
  // https://github.com/ecoacoustics/web-components/issues/139
  public subjectHistory: SubjectWrapper[] = [];
  private verificationBuffer: SubjectWrapper[] = [];
  private requiredClassificationTags: Tag[] = [];
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

  /** A count of the number of tiles currently visible on the screen */
  private get effectivePageSize(): number {
    return this.gridSize - this.hiddenTiles;
  }

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

  protected willUpdate(change: PropertyValues<this>): void {
    // whenever the gridSize property updates, we check that the new value
    // is a finite, positive number. If it is not, then we cancel the change
    // and revert to the old value
    if (change.has("gridSize")) {
      const oldGridSize = change.get("gridSize") as number;
      const newGridSize = this.gridSize;

      // we use isFinite here to check that the value is not NaN, and that
      // values such as Infinity are not considered as a valid grid size
      if (!isFinite(newGridSize) || newGridSize <= 0) {
        this.gridSize = oldGridSize;
        console.error("New grid size value could not be converted to a number");
      }
    }
  }

  protected async updated(change: PropertyValueMap<this>): Promise<void> {
    const tileInvalidationKeys: (keyof this)[] = ["selectionBehavior"];
    // gridSize is a part of source invalidation because if the grid size
    // increases, there will be verification grid tiles without any source
    // additionally, if the grid size is decreased, we want the "currentPage"
    // of sources to update / remove un-needed items
    const sourceInvalidationKeys: (keyof this)[] = ["getPage", "gridSize"];

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
    this.skipButton.selectionMode = selectionBehavior;
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
    this.subjectHistory = [];

    if (this.getPage) {
      this.paginationFetcher = new GridPageFetcher(this.getPage);
      this.currentPage = await this.paginationFetcher.getItems(this.gridSize);
    }
  }

  private updateRequiredClassificationTags(): void {
    const requiredTags = new Map<string, Tag>();

    // we use a map indexed by the tag text so that we don't get duplicate tags
    // with the same text property
    // we do not use a filter condition because we'd have to use an inner
    // indexOf function to check if a tag with the same text is already present
    // making the use of a filter condition O(n^2)
    const classificationTags = this.classificationDecisionElements.map((element) => element.tag);
    for (const tag of classificationTags) {
      requiredTags.set(tag.text, tag);
    }

    this.requiredClassificationTags = Array.from(requiredTags.values());
  }

  private updateInjector(): void {
    this.injector.colorService = decisionColor;
  }

  //#endregion

  //#region EventHandlers
  private handleKeyDown(event: KeyboardEvent): void {
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

    // MacOS uses the command key instead of the ctrl key for keyboard shortcuts
    // e.g. Command + A should select all items
    // The command key is defined as the "meta" key in the KeyboardEvent object
    // therefore, we conditionally check if the meta key is pressed instead of
    // the ctrl key if the user is on a Mac
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey
    const hasToggleModifier = hasCtrlLikeModifier(event);

    switch (event.key) {
      case LEFT_ARROW_KEY: {
        event.preventDefault();
        this.handlePreviousPageClick();
        break;
      }

      case RIGHT_ARROW_KEY: {
        event.preventDefault();
        this.handleNextPageClick();
        break;
      }

      // if the user is holding down both ctrl and D, we should remove the
      // current selection (this is a common behavior in other applications)
      case "d": {
        if (hasToggleModifier) {
          // in Chrome and FireFox, Ctrl + D is a browser shortcut to bookmark
          // the current page. We prevent default so that the user can use
          // ctrl + D to remove the current selection
          event.preventDefault();
          this.removeSubSelection();
        }
        break;
      }

      case "a": {
        if (hasToggleModifier) {
          // we prevent default on the ctrl + A event so that chrome doesn't
          // select all the text on the page
          event.preventDefault();
        }

        this.subSelectAll();
        break;
      }

      case "?": {
        this.helpDialog.showModal(false);
        break;
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // we bind the escape key to keyUp because MacOS doesn't trigger keydown
    // events when the escape key is pressed
    // related to: https://stackoverflow.com/a/78872316
    if (event.key === ESCAPE_KEY) {
      this.removeSubSelection();
      return;
    }

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

  private handleSlotChange(): void {
    this.updateRequiredClassificationTags();
    this.updateInjector();
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
    // if the user cannot sub-select e.g. in a 1x1 grid, showing selection
    // shortcuts can become confusing because it will have no effect
    if (!this.canSubSelect()) {
      return;
    }

    this.showingSelectionShortcuts = true;
    this.tileSelectionShortcutsShown(true);
  }

  private hideSelectionShortcuts(): void {
    this.tileSelectionShortcutsShown(false);
    this.showingSelectionShortcuts = false;
  }

  // TODO: The intersection observer has been disabled because its functionality
  // is buggy when the verification grid is larger than the screen size
  // see: https://github.com/ecoacoustics/web-components/issues/146
  // see: https://github.com/ecoacoustics/web-components/issues/147
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleIntersection(_entries: IntersectionObserverEntry[]): void {
    // for (const entry of entries) {
    //   if (entry.intersectionRatio < 1) {
    //     // at the very minimum, we always want one grid tile showing
    //     // even if this will cause some items to go off the screen
    //     const newProposedHiddenTiles = this.hiddenTiles + 1;
    //     if (newProposedHiddenTiles < this.gridSize) {
    //       this.hideGridItems(newProposedHiddenTiles);
    //     }
    //   }
    // }
  }

  private handleSelection(selectionEvent: SelectionEvent): void {
    if (!this.canSubSelect()) {
      return;
    }

    let selectionBehavior = this.selectionBehavior;
    if (selectionBehavior === "default") {
      selectionBehavior = this.isMobileDevice() ? "tablet" : "desktop";
    }

    const selectionIndex = selectionEvent.detail.index;

    // in desktop mode, unless the ctrl key is held down, clicking an element
    // removes all other selected items
    // while it is not possible to press the ctrl key on a tablet, the user can
    // still overwrite the selection behavior using the selection-behavior
    // attribute. Therefore, we have to check that we are not on explicitly
    // using tablet selection mode.
    if (selectionBehavior === "desktop" && !selectionEvent.detail.ctrlKey) {
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
    } else {
      // if we reach this point, we know that the user is not performing a
      // range selection because range selection performs an early return
      this.toggleTileSelection(selectionIndex);
      this.selectionHead = selectionIndex;
    }

    this.updateSubSelection();
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
    if (!this.canSubSelect()) {
      return;
    }

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

    const highlightXDelta = Math.abs(highlightWidth);
    const highlightYDelta = Math.abs(highlightHeight);
    const highlightThreshold = 15 as const;
    const meetsHighlightThreshold = Math.max(highlightXDelta, highlightYDelta) > highlightThreshold;
    if (meetsHighlightThreshold) {
      element.style.display = "block";
    } else {
      return;
    }

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

  private async handlePreviousPageClick(): Promise<void> {
    if (this.canNavigatePrevious()) {
      this.historyHead += this.gridSize;
      await this.renderHistory(this.historyHead);
    }
  }

  private handleNextPageClick(): void {
    if (this.isViewingHistory()) {
      this.pageForwardHistory();
    }
  }

  private async pageForwardHistory(): Promise<void> {
    if (this.canNavigateNext()) {
      this.historyHead -= this.gridSize;
      await this.renderHistory(this.historyHead);
    }
  }

  private async renderHistory(historyOffset: number) {
    const decisionStart = Math.max(0, this.subjectHistory.length - historyOffset);
    const decisionEnd = Math.min(this.subjectHistory.length, decisionStart + this.gridSize);
    const decisionHistory = this.subjectHistory.slice(decisionStart, decisionEnd);

    this.historyMode();
    await this.renderVirtualPage(decisionHistory);
  }

  /**
   * @description
   * Change the verification grid to the "history mode" layout
   * Note: Changing to "History Mode" does not render the history. It is only
   *       responsible for changing the layout of the verification grid.
   */
  private historyMode(): void {
    if (this.subjectHistory.length === 0) {
      throw new Error("No decisions to show in history");
    }

    // if the user has completed all their verifications, then all the grid
    // items would have been removed
    // therefore, we have to recreate these grid tiles before we can start
    // rendering history (if they are not present)
    if (!this.gridTiles || this.gridTiles.length === 0) {
      // TODO: forcing a synchronous update is hacky, and we should definitely remove it
      this.performUpdate();
    }
  }

  /**
   * @description
   * Change the verification grid to the "normal mode" layout
   * Note: Changing to "Verification Mode" does not stop rendering history
   *       responsible for changing the layout of the verification grid.
   */
  private verificationMode(): void {
    this.removeSubSelection();
    this.historyHead = 0;
  }

  /**
   * @description
   * Changes to the "verification mode" and renders the
   */
  private async resumeVerification(): Promise<void> {
    await this.renderVirtualPage(this.verificationBuffer);
    this.verificationMode();
  }

  // we ue the effective grid size here so that hidden tiles are not counted
  // when the user pages
  private async nextPage(count: number = this.effectivePageSize): Promise<void> {
    this.removeSubSelection();
    this.resetSpectrogramSettings();

    if (!this.paginationFetcher) {
      throw new Error("No paginator found.");
    }

    this.subjectHistory.push(...this.currentPage);
    this.currentPage = await this.paginationFetcher.getItems(count);
    this.verificationBuffer = this.currentPage;
    await this.renderVirtualPage(this.currentPage);
  }

  private canNavigatePrevious(): boolean {
    const hasHistory = this.pagedItems > 0;
    const canNavigateBackHistory = this.historyHead < this.subjectHistory.length;
    return hasHistory && canNavigateBackHistory;
  }

  private canNavigateNext(): boolean {
    return this.historyHead > this.gridSize;
  }

  //#endregion

  //#region Decisions

  private async handleDecision(event: DecisionEvent) {
    // if the dialog box is open, we don't want to catch events
    // because the user could accidentally create a decision by using the
    // decision keyboard shortcuts while the help dialog is open
    if (this.isHelpDialogOpen()) {
      return;
    }

    const userDecisions = event.detail.value;

    const gridTiles = Array.from(this.gridTiles);
    const subSelection = gridTiles.filter((tile) => tile.selected);
    const hasSubSelection = subSelection.length > 0;
    const trueSubSelection = hasSubSelection ? subSelection : gridTiles;

    const selectedTiles = trueSubSelection.filter((tile) => !tile.hidden);

    const tileDecisions: [VerificationGridTileComponent, Decision[]][] = selectedTiles.map(
      (tile: VerificationGridTileComponent) => [tile, userDecisions],
    );

    for (const [tile, decisions] of tileDecisions) {
      for (const decision of decisions) {
        if (decision instanceof Verification) {
          decision.tag = tile.model.tag;
        }

        // for each decision [button] we have a toggling behavior where if the
        // decision is not present on a tile, then we want to add it and if the
        // decision is already present on a tile, we want to remove it
        if (tile.model.hasDecision(decision)) {
          tile.removeDecision(decision);
        } else {
          tile.addDecision(decision);
        }
      }
    }

    this.dispatchEvent(new CustomEvent(VerificationGridComponent.decisionMadeEventName, { detail: tileDecisions }));
    if (this.shouldAutoPage()) {
      // we wait for 300ms so that the user has time to see the decision that
      // they have made in the form of a decision highlight around the selected
      // grid tiles and the chosen decision button
      await sleep(0.3);
      await this.nextPage();
    }
  }

  // TODO: finish this function
  private shouldAutoPage(): boolean {
    // I have disabled auto paging when viewing history so that the user can see
    // the colors change when they change an applied decision

    return !this.isViewingHistory() && !this.hasOutstandingVerification() && !this.hasOutstandingClassification();
  }

  private tilesRequiredTags(subject: SubjectWrapper): Tag[] {
    const classificationTags = this.requiredClassificationTags;

    if (!this.hasVerificationTask()) {
      return classificationTags;
    }

    const verificationTag = subject.tag;
    return classificationTags.concat(verificationTag);
  }

  // for verification tasks, the user will be adding one verification decision
  // to each grid tile. Therefore, we can test that there is some sort of
  // verifications applied to every tile
  private hasOutstandingVerification(): boolean {
    // we short circuit this function if there are no possible verification
    // decisions
    if (!this.hasVerificationTask()) {
      return false;
    }

    const verificationTiles = this.gridTiles;
    for (const tile of verificationTiles) {
      const hasVerificationDecision = tile.model.verification !== undefined;

      if (!hasVerificationDecision) {
        return true;
      }
    }

    return false;
  }

  // during a classification task, we want to ensure that every tile has a
  // decision about every tag (not classification decision)
  // we don't check against classification decisions because we want to support
  // adding "negative" classifications against a tile
  private hasOutstandingClassification(): boolean {
    // because computing outstanding classification tasks is expensive, we can
    // short circuit this function if there are no classification tasks
    if (!this.hasClassificationTask()) {
      return false;
    }

    // we use the tag to check if there are outstanding classifications
    // (instead of the decision identifier) so that negative/positive decisions
    // on the same tag are not counted as two separate decisions
    // meaning that we only have to make a classification about each tag once
    const requiredTags: Tag[] = this.classificationDecisionElements.map(
      (element: ClassificationComponent) => element.tag,
    );

    const verificationTiles = Array.from(this.gridTiles);
    return !verificationTiles.every((tile) => tile.model.hasTags(requiredTags));
  }

  private setDecisionDisabled(disabled: boolean): void {
    const decisionElements = this.decisionElements ?? [];
    for (const decisionElement of decisionElements) {
      decisionElement.disabled = disabled;
    }

    this.decisionsDisabled = disabled;
    this.skipButton.disabled = disabled;
  }

  //#endregion

  //#region Rendering

  private async renderVirtualPage(nextPage: SubjectWrapper[]): Promise<void> {
    // even though making a decision will cause the spectrograms to load and
    // emit the "loading" event (causing the decision buttons to be disabled)
    // there can be some input lag between when we request to change the src
    // and when the spectrograms begin to start rendering
    // I also do this first so that if the functionality below fails then the
    // user can't continue making decisions that won't be saved when downloaded
    this.setDecisionDisabled(true);

    // by setting the current page, we trigger the template to render the
    // grid tiles with the new subjects
    this.currentPage = nextPage;

    const elements = this.gridTiles;
    if (elements === undefined || elements.length === 0) {
      return;
    }

    // if this guard condition is true, it means that we have exhausted the
    // entire data source provided by the getPage callback
    if (nextPage.length === 0) {
      return;
    }

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

  //#region Prompts

  private hasClassificationTask(): boolean {
    return this.classificationDecisionElements.length > 0;
  }

  private hasVerificationTask(): boolean {
    return this.verificationDecisionElements.length > 0;
  }

  private mixedTaskPromptTemplate(hasMultipleTiles: boolean, hasSubSelection: boolean): TemplateResult<1> {
    if (hasSubSelection) {
      return html`<p>Make a decision about all of the selected audio segments</p>`;
    }

    if (hasMultipleTiles) {
      return html`<p>Make a decision about all of the audio segments</p>`;
    } else {
      return html`<p>Make a decision about the shown audio segment</p>`;
    }
  }

  private classificationTaskPromptTemplate(hasMultipleTiles: boolean, hasSubSelection: boolean): TemplateResult<1> {
    if (hasSubSelection) {
      return html`<p>Apply labels to selected audio segments</p>`;
    }

    if (hasMultipleTiles) {
      return html`<p>Classify all relevant audio segments</p>`;
    } else {
      return html`<p>Apply a classification to the audio segment</p>`;
    }
  }

  private verificationTaskPromptTemplate(hasMultipleTiles: boolean, hasSubSelection: boolean): TemplateResult<1> {
    if (hasSubSelection) {
      return html`<p>Do all of the selected audio segments have the correct applied tag</p>`;
    }

    if (hasMultipleTiles) {
      return html`<p>Do all of the audio segments have the correct applied tag</p>`;
    } else {
      return html`<p>Does the show audio segment have the correct applied tag</p>`;
    }
  }

  private decisionPromptTemplate(): TemplateResult<1> {
    const subSelection = this.currentSubSelection;
    const hasSubSelection = subSelection.length > 0;
    const hasMultipleTiles = this.gridSize > 1;

    if (this.hasClassificationTask() && this.hasVerificationTask()) {
      return this.mixedTaskPromptTemplate(hasMultipleTiles, hasSubSelection);
    } else if (this.hasClassificationTask()) {
      return this.classificationTaskPromptTemplate(hasMultipleTiles, hasSubSelection);
    } else if (this.hasVerificationTask()) {
      return this.verificationTaskPromptTemplate(hasMultipleTiles, hasSubSelection);
    }

    // default prompt if we can't determine if it is a classification or
    // verification task
    if (hasSubSelection) {
      return html`<p>Are all of the selected a</p>`;
    }
    return html`<p>${hasMultipleTiles ? "Are all of these a" : "Is the shown spectrogram a"}</p>`;
  }

  //#endregion

  //#region Templates

  private statisticsTemplate(): TemplateResult<1> {
    return html`
      <div class="statistics-section">
        <h2>Statistics</h2>
        <p><span>Validated Items</span>: ${this.subjectHistory.length}</p>
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
    return html`<strong class="no-decisions-warning">No decisions available.</strong>`;
  }

  // TODO: this function could definitely be refactored
  private skipDecisionTemplate(): TemplateResult<1> {
    const skipEventHandler = async (event: DecisionEvent) => {
      event.stopPropagation();

      const requiredTags = this.requiredClassificationTags;
      const hasVerificationTask = this.hasVerificationTask();

      const gridTiles = this.gridTiles;
      for (const tile of gridTiles) {
        tile.model.skipUndecided(hasVerificationTask, requiredTags);
      }

      await this.nextPage();
    };

    return html`<button id="skip-button" class="oe-btn-primary" @click="${skipEventHandler}">Skip</button>`;
  }

  public render() {
    let customTemplate: any = nothing;
    if (this.gridItemTemplate) {
      customTemplate = this.gridItemTemplate.cloneNode(true);
    }

    return html`
      <oe-verification-help-dialog
        @open="${this.handleHelpDialogOpen}"
        @close="${this.handleHelpDialogClose}"
        verificationTasksCount="${this.hasVerificationTask() ? 1 : 0}"
        classificationTasksCount="${this.requiredClassificationTags.length}"
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
          ${when(
            this.currentPage.length === 0,
            () => this.noItemsTemplate(),
            () => html`
              ${repeat(
                this.currentPage,
                (subject: SubjectWrapper, i: number) => html`
                  <oe-verification-grid-tile
                    @loaded="${this.handleSpectrogramLoaded}"
                    .requiredTags="${this.tilesRequiredTags(subject)}"
                    .model="${subject}"
                    .index="${i}"
                  >
                    ${unsafeHTML(customTemplate.innerHTML)}
                  </oe-verification-grid-tile>
                `,
              )}
            `,
          )}
        </div>

        <div class="verification-controls">
          <span class="decision-controls-left">
            <oe-verification-grid-settings></oe-verification-grid-settings>

            <button
              data-testid="help-dialog-button"
              @click="${() => this.helpDialog.showModal(false)}"
              class="oe-btn-info"
              rel="help"
            >
              <sl-icon name="question-circle" class="large-icon"></sl-icon>
            </button>

            <button
              data-testid="previous-page-button"
              class="oe-btn oe-btn-secondary"
              ?disabled="${!this.canNavigatePrevious()}"
              @click="${this.handlePreviousPageClick}"
            >
              ${this.gridSize > 1 ? "Previous Page" : "Previous"}
            </button>

            <button
              data-testid="next-page-button"
              class="oe-btn-secondary"
              ?disabled="${!this.canNavigateNext()}"
              @click="${this.handleNextPageClick}"
            >
              ${this.gridSize > 1 ? "Next Page" : "Next"}
            </button>

            <button
              data-testid="continue-verifying-button"
              class="oe-btn-secondary ${classMap({ hidden: !this.isViewingHistory() })}"
              ?disabled="${!this.isViewingHistory()}"
              @click="${this.resumeVerification}"
            >
              Continue ${this.hasVerificationTask() ? "Verifying" : "Classifying"}
            </button>
          </span>

          <span class="decision-controls">
            <h2 class="verification-controls-title">
              ${this.hasDecisionElements() ? this.decisionPromptTemplate() : this.noDecisionsTemplate()}
            </h2>
            <div id="decisions-container" class="decision-control-actions">
              <slot @slotchange="${this.handleSlotChange}"></slot>
              ${this.skipDecisionTemplate()}
            </div>
          </span>

          <span class="decision-controls-right">
            <slot name="data-source"></slot>
          </span>
        </div>

        <div>${this.statisticsTemplate()}</div>
      </div>
    `;
  }

  //#endregion
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-verification-grid": VerificationGridComponent;
  }
}
