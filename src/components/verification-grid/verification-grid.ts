import { customElement, property, query, queryAll, queryAssignedElements, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, nothing, PropertyValueMap, PropertyValues, TemplateResult, unsafeCSS } from "lit";
import {
  OverflowEvent,
  RequiredDecision,
  requiredVerificationPlaceholder,
  VerificationGridTileComponent,
} from "../verification-grid-tile/verification-grid-tile";
import { DecisionComponent, DecisionComponentUnion, DecisionEvent } from "../decision/decision";
import { callbackConverter } from "../../helpers/attributes";
import { sleep } from "../../helpers/utilities";
import { classMap } from "lit/directives/class-map.js";
import { GridPageFetcher, PageFetcher } from "../../services/gridPageFetcher";
import { ESCAPE_KEY, LEFT_ARROW_KEY, RIGHT_ARROW_KEY, SPACE_KEY } from "../../helpers/keyboard";
import { SubjectWrapper } from "../../models/subject";
import { ClassificationComponent } from "../decision/classification/classification";
import { VerificationComponent } from "../decision/verification/verification";
import { Decision } from "../../models/decisions/decision";
import { Tag } from "../../models/tag";
import { provide } from "@lit/context";
import { signal, Signal } from "@lit-labs/preact-signals";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { repeat } from "lit/directives/repeat.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { when } from "lit/directives/when.js";
import { hasCtrlLikeModifier } from "../../helpers/userAgent";
import { decisionColor } from "../../services/colors";
import { ifDefined } from "lit/directives/if-defined.js";
import { DynamicGridSizeController, GridShape } from "../../helpers/controllers/dynamic-grid-sizes";
import { injectionContext, verificationGridContext } from "../../helpers/constants/contextTokens";
import { UrlTransformer } from "../../services/subjectParser";
import { VerificationBootstrapComponent } from "bootstrap-modal/bootstrap-modal";
import verificationGridStyles from "./css/style.css?inline";

export type SelectionObserverType = "desktop" | "tablet" | "default";

export type PageOperation = <T = unknown>(subject: SubjectWrapper) => T;

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

type SelectionEvent = CustomEvent<{
  shiftKey: boolean;
  ctrlKey: boolean;
  index: number;
}>;

interface HighlightSelection {
  start: MousePosition;
  current: MousePosition;
  highlighting: boolean;

  // we store the observed elements in an array so that we don't re-query the
  // DOM for the grid tiles every time the highlight box is resized
  //! Warning: be sure to update this array if grid tiles are added/removed
  observedElements: VerificationGridTileComponent[];
}

interface CurrentPage {
  start: number;
  end: number;
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
  public targetGridSize = 10;

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

  /**
   * A callback function that will be applied to all subject urls
   *
   * @default
   * an identity function that returns the url unchanged
   */
  @property({ attribute: "url-transformer", type: Function, converter: callbackConverter as any })
  public urlTransformer: UrlTransformer = (url) => url;

  /** selector for oe-verification elements */
  @queryAssignedElements({ selector: "oe-verification" })
  private verificationDecisionElements!: VerificationComponent[];

  /** selector for oe-classification elements */
  @queryAssignedElements({ selector: "oe-classification" })
  private classificationDecisionElements!: ClassificationComponent[];

  /** A selector for all oe-verification and oe-classification elements */
  @queryAssignedElements({ selector: "oe-verification, oe-classification" })
  private decisionElements!: DecisionComponentUnion[];

  @queryDeeplyAssignedElement({ selector: "template" })
  private gridItemTemplate?: HTMLTemplateElement;

  @queryAll("oe-verification-grid-tile")
  private gridTiles!: NodeListOf<VerificationGridTileComponent>;

  @query("oe-verification-bootstrap")
  private helpDialog!: VerificationBootstrapComponent;

  @query("#grid-container")
  private gridContainer!: HTMLDivElement;

  @query("#decisions-container")
  private decisionsContainer!: HTMLSlotElement;

  @query("#skip-button")
  private skipButton!: DecisionComponent;

  @query("#highlight-box")
  private highlightBox!: HTMLDivElement;

  @state()
  public columns = this.targetGridSize;

  @state()
  public rows = 1;

  @state()
  private currentSubSelection: SubjectWrapper[] = [];

  public get gridShape(): GridShape {
    return { columns: this.columns, rows: this.rows };
  }

  /**
   * The index of the first item from the `subjects` array in the currently
   * displayed verification grid page
   */
  public get viewHead(): number {
    return this.viewHeadIndex;
  }

  public set viewHead(value: number) {
    let clampedHead = Math.min(Math.max(0, value), this.decisionHead);

    // because the viewHead is an index into the "subjects" array, it cannot
    // be larger than the length of the subjects array.
    // if we receive a value that is larger than the subjects buffer, we emit
    // a warning so that we can catch it in dev, and use the subject arrays
    // length as a fallback to prevent hard-failing.
    const avaliableSubjectsCount = this.subjects.length;
    if (clampedHead > avaliableSubjectsCount) {
      console.warn("Attempted to set the viewHead to a value larger than the subjects array");
      clampedHead = avaliableSubjectsCount;
    }

    this.viewHeadIndex = clampedHead;
    this.renderVirtualPage();
  }

  /**
   * The index from the `subjects` array indicating up to which point
   * decisions have been made
   * It is updated as each page is completed
   */
  public get decisionHead(): number {
    return this.decisionHeadIndex;
  }

  private set decisionHead(value: number) {
    this.decisionHeadIndex = value;
    this.paginationFetcher?.populateSubjects(this.decisionHead);
  }

  /** A count of the number of tiles shown in the grid */
  public get populatedTileCount(): number {
    // we want to respect the users grid size preference if it fits
    // however, if the requested grid size does not fit, we will use the
    // computed grid size which is the maximum number of tiles that we could
    // fit on the page
    const gridSize = this.rows * this.columns;
    return Math.min(gridSize, this.targetGridSize);
  }

  /** A count of the number of tiles currently visible on the screen */
  public get effectivePageSize(): number {
    return this.populatedTileCount - this.hiddenTiles;
  }

  private get currentPageIndices(): CurrentPage {
    const start = this.viewHead;

    const endCandidate = start + this.effectivePageSize;
    const end = Math.min(endCandidate, this.subjects.length);

    return { start, end };
  }

  private keydownHandler = this.handleKeyDown.bind(this);
  private keyupHandler = this.handleKeyUp.bind(this);
  private blurHandler = this.handleWindowBlur.bind(this);
  private selectionHandler = this.handleSelection.bind(this);
  private decisionHandler = this.handleDecision.bind(this);

  public subjects: SubjectWrapper[] = [];

  private decisionHeadIndex = 0;
  private viewHeadIndex = 0;

  private requiredClassificationTags: Tag[] = [];
  private requiredDecisions: RequiredDecision[] = [];
  private hiddenTiles = 0;
  private decisionsDisabled = false;
  private showingSelectionShortcuts = false;
  private selectionHead: number | null = null;
  private anyOverlap = signal<boolean>(false);
  private gridController?: DynamicGridSizeController<HTMLDivElement>;
  private paginationFetcher?: GridPageFetcher;
  private highlight: HighlightSelection = {
    start: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    highlighting: false,
    observedElements: [],
  };

  public connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("keydown", this.keydownHandler);
    this.addEventListener("keyup", this.keyupHandler);
    window.addEventListener("blur", this.blurHandler);
  }

  public disconnectedCallback(): void {
    this.removeEventListener("keydown", this.keydownHandler);
    this.removeEventListener("keyup", this.keyupHandler);
    window.removeEventListener("blur", this.blurHandler);

    this.gridContainer.removeEventListener<any>("selected", this.selectionHandler);
    this.decisionsContainer.removeEventListener<any>("decision", this.decisionHandler);

    super.disconnectedCallback();
  }

  public isViewingHistory(): boolean {
    // we know that the user is viewing history if the subjectBuffer index
    // currently being displayed is less than where the user has verified up to
    return this.viewHead < this.decisionHead;
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

  // because subjects are appended into the "subjects" array asyncronously by
  // the gridPageFetcher, it is possible for the verification grid to be ahead
  // of where the async page fetcher has populated the subjects up to.
  // therefore, we use a callback to append to the "subjects" array so that we
  // can trigger change detection if we receive new subjects when we are
  // currently displaying none
  public pushToSubjects(value: SubjectWrapper[]): void {
    this.subjects.push(...value);

    // tiles will be hidden when the provided dataset does not provide enough
    // data to create a full verification grid page.
    // if we were previously lacking the data to fill a verification grid and
    // we just appended more items, we should re-render the verification grid
    // so that the new data can be added
    this.renderVirtualPage();
  }

  public firstUpdated(): void {
    this.gridContainer.addEventListener<any>("selected", this.selectionHandler);
    this.decisionsContainer.addEventListener<any>("decision", this.decisionHandler);

    // if the user has explicitly set a grid size through the `grid-size`
    // attribute, we should use that grid size
    // however, if the verification grid does not have a `grid-size` attribute
    // then we look at our grid size breakpoints to determine the grid size
    // that will fit the best on the screen
    if (!this.targetGridSize) {
      const targetSize = this.defaultGridSize();
      this.targetGridSize = targetSize;
    }
  }

  protected willUpdate(change: PropertyValues<this>): void {
    // whenever the targetGridSize property updates, we check that the new value
    // is a finite, positive number. If it is not, then we cancel the change
    // and revert to the old value
    if (change.has("targetGridSize")) {
      const oldGridSize = change.get("targetGridSize") as number;
      const newGridSize = this.targetGridSize;

      // we use isFinite here to check that the value is not NaN, and that
      // values such as Infinity are not considered as a valid grid size
      if (!isFinite(newGridSize) || newGridSize <= 0) {
        this.targetGridSize = oldGridSize;
        console.error(`New grid size "${newGridSize}" could not be converted to a finite number`);
      }
    }
  }

  protected async updated(change: PropertyValueMap<this>): Promise<void> {
    if (this.gridContainer && change.has("targetGridSize")) {
      this.gridController ??= new DynamicGridSizeController(this.gridContainer, this, this.anyOverlap);
      this.gridController.setTarget(this.targetGridSize);
    }

    // tile invalidations cause the functionality of the tiles to change
    // however, they do not cause the spectrograms or the template to render
    const tileInvalidationKeys: (keyof this)[] = ["selectionBehavior"];
    if (tileInvalidationKeys.some((key) => change.has(key))) {
      this.handleTileInvalidation();
    }

    // invalidating the verification grids source will cause the grid tiles and
    // spectrograms to re-render, from the start of the new data source
    const gridSourceInvalidationKeys: (keyof this)[] = ["getPage", "urlTransformer"];
    if (gridSourceInvalidationKeys.some((key) => change.has(key))) {
      await this.handleGridSourceInvalidation();
    }

    // gridSize is a part of page source invalidation because if the grid size
    // increases, there will be verification grid tiles without any source
    // additionally, if the grid size is decreased, we want the "currentPage"
    // of sources to update / remove un-needed items
    const pageInvalidationKeys: (keyof this)[] = ["targetGridSize", "columns", "rows"];
    if (pageInvalidationKeys.some((key) => change.has(key))) {
      this.handlePageInvalidation();
    }
  }

  private defaultGridSize(): number {
    const screenSize = window.screen;

    // for mobile devices, we want to show a single tile
    // for anything that is larger than a phone, we want to target ten tiles
    // if ten tiles will not fit on the screen, the grid will automatically
    // select the largest grid size that will fit
    if (screenSize.width <= 720) {
      return 1;
    } else {
      return 10;
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

  /**
   * handles the data source of the verification grid changing
   * this will reset the verification task and re-fetch the first page of
   * subjects from the new data source
   */
  private async handleGridSourceInvalidation(): Promise<void> {
    this.resetBufferHeads();

    if (this.getPage) {
      this.paginationFetcher = new GridPageFetcher(
        this.getPage,
        this.urlTransformer,
        this.subjects,
        this.pushToSubjects.bind(this),
      );
      await this.paginationFetcher.populateSubjects(this.decisionHead);
      this.renderVirtualPage();
    }

    // if grid tile elements change during a selection event, we want to add
    // observe the overlap with new elements and remove the overlap checks of
    // old elements that no longer exist
    //
    // because updating the observed elements requires a DOM query, I only want
    // to update the observed elements if the grid tiles have changed during a
    // selection event
    if (this.highlight.highlighting) {
      this.updateHighlightObservedElements();
    }
  }

  /**
   * handles the currently rendered page of subjects changing
   * e.g. the number of tiles being rendered, or the source of a singular tile
   *      changing
   * causing the current page to be re-rendered from the viewHead position
   */
  private handlePageInvalidation(): void {
    this.renderVirtualPage();
  }

  private resetBufferHeads(): void {
    this.viewHead = 0;
    this.decisionHead = 0;
  }

  private updateRequiredDecisions(): void {
    let foundVerification = false;
    const result: RequiredDecision[] = [];

    for (const decisionElement of this.decisionElements) {
      if (decisionElement instanceof VerificationComponent && !foundVerification) {
        foundVerification = true;
        result.push(requiredVerificationPlaceholder);
      } else if (decisionElement instanceof ClassificationComponent) {
        result.push(decisionElement.tag);
      }
    }

    this.requiredDecisions = result;
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

  private updateDecisionElements(): void {
    for (const element of this.decisionElements) {
      element.verificationGrid = this;
    }
  }

  private *currentPage(): Generator<SubjectWrapper, void, void> {
    const page = this.currentPageIndices;
    for (let i = page.start; i < page.end; i++) {
      yield this.subjects[i];
    }
  }

  //#endregion

  //#region EventHandlers
  private handleKeyDown(event: KeyboardEvent): void {
    // most browsers scroll a page width when the user presses the space bar
    // however, since space bar can also be used to play spectrograms, we don't
    // want to scroll when the space bar is pressed
    if (event.key === SPACE_KEY) {
      event.preventDefault();
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
          this.subSelectAll();
        }
        break;
      }

      case "?": {
        this.helpDialog.showModal();
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
    this.updateRequiredDecisions();
    this.updateInjector();
    this.updateDecisionElements();
  }

  private handleTileOverlap(event: OverflowEvent): void {
    if (event.detail.isOverlapping === this.anyOverlap.value) {
      return;
    }

    const gridTiles = this.gridTiles;
    for (const tile of gridTiles) {
      if (tile.isOverlapping) {
        this.anyOverlap.value = true;
        return;
      }
    }

    this.anyOverlap.value = false;
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
    return this.populatedTileCount > 1 && !this.isHelpDialogOpen();
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
    } else if (event.button !== 0) {
      // if the user is not using the left mouse button we do not want to
      // render a selection highlight box
      // allowing users to create selection highlight boxes with non-primary
      // buttons, can cause bugs
      // e.g. Using right click to create a selection highlight box will cause
      // the context menu to open, and will stop the pointerUp event from
      // triggering which is needed to stop highlight selection
      return;
    }

    if (event.isPrimary) {
      if (!this.shadowRoot) {
        return;
      }

      this.highlight.highlighting = true;

      const highlightBoxElement = this.highlightBox;
      this.updateHighlightObservedElements();

      const { pageX, pageY } = event;

      highlightBoxElement.style.left = `${pageX}px`;
      highlightBoxElement.style.top = `${pageY}px`;

      this.highlight.start = { x: pageX, y: pageY };
    }
  }

  private updateHighlightObservedElements(): void {
    this.highlight.observedElements = Array.from(this.gridTiles);
  }

  private resizeHighlightBox(event: PointerEvent) {
    if (!this.highlight.highlighting || !this.shadowRoot) {
      return;
    }

    const highlightBoxElement = this.highlightBox;

    const { pageX, pageY } = event;
    this.highlight.current = { x: pageX, y: pageY };

    const highlightWidth = this.highlight.current.x - this.highlight.start.x;
    const highlightHeight = this.highlight.current.y - this.highlight.start.y;

    const highlightXDelta = Math.abs(highlightWidth);
    const highlightYDelta = Math.abs(highlightHeight);
    const highlightThreshold = 15 as const;
    const meetsHighlightThreshold = Math.max(highlightXDelta, highlightYDelta) > highlightThreshold;
    if (meetsHighlightThreshold) {
      highlightBoxElement.style.display = "block";
    } else {
      return;
    }

    // the highlights width / height can be negative if the user drags to the
    // top or left of the screen
    highlightBoxElement.style.width = `${Math.abs(highlightWidth)}px`;
    highlightBoxElement.style.height = `${Math.abs(highlightHeight)}px`;

    // if the user selects from the right to the left, we change the position
    // of the highlight box to so that the top left of the highlight box is
    // always aligned with the users pointer
    if (highlightWidth < 0) {
      highlightBoxElement.style.left = `${pageX}px`;
    }

    if (highlightHeight < 0) {
      highlightBoxElement.style.top = `${pageY}px`;
    }

    this.calculateHighlightIntersection();
  }

  private calculateHighlightIntersection(): void {
    const selectionLeftSide = Math.min(this.highlight.start.x, this.highlight.current.x);
    const selectionTopSide = Math.min(this.highlight.start.y, this.highlight.current.y);

    const selectionRightSide = Math.max(this.highlight.start.x, this.highlight.current.x);
    const selectionBottomSide = Math.max(this.highlight.start.y, this.highlight.current.y);

    for (const target of this.highlight.observedElements) {
      const targetTop = target.offsetTop;
      const targetBottom = targetTop + target.offsetHeight;
      const targetLeft = target.offsetLeft;
      const targetRight = targetLeft + target.offsetWidth;

      // seeing each of these conditions individually is a lot easier to
      // understand than seeing them all condensed into a single line
      // since prettier wants to consolidate all these conditions into one
      // line, I use prettier ignore
      // prettier-ignore
      const isOverlapping =
        targetLeft <= selectionRightSide &&
        targetRight >= selectionLeftSide &&
        targetTop <= selectionBottomSide &&
        targetBottom >= selectionTopSide;

      target.selected = isOverlapping;
    }

    this.updateSubSelection();
  }

  private hideHighlightBox(): void {
    // we set the highlighting to false before the function guards so that if
    // the user (somehow) changes from a desktop device to a mobile device
    // while the highlight box is open, the highlight box will be correctly
    // hidden
    // this can (rarely) occur when the user switches between "desktop view"
    // in their browser settings
    this.highlight.highlighting = false;

    if (!this.shadowRoot || this.isMobileDevice()) {
      return;
    }

    // TODO: improve this logic
    const highlightBoxElement = this.highlightBox;
    highlightBoxElement.style.width = "0px";
    highlightBoxElement.style.height = "0px";
    highlightBoxElement.style.top = "0px";
    highlightBoxElement.style.left = "0px";
    highlightBoxElement.style.display = "none";
  }

  //#endregion

  //#region Navigation

  private async handlePreviousPageClick(): Promise<void> {
    if (this.canNavigatePrevious()) {
      this.pageBackward();
    }
  }

  private handleNextPageClick(): void {
    if (this.canNavigateNext()) {
      this.pageForward();
    }
  }

  private async pageForward(): Promise<void> {
    const proposedViewHead = this.viewHead + this.populatedTileCount;
    this.viewHead = proposedViewHead;
    this.removeSubSelection();
  }

  private pageBackward(): void {
    // the new viewHead value is only a proposal for the viewHead setter
    // because the viewHead setter might reject the new value if it is less
    // than zero or exceeds the length of the subjects array
    const proposedHead = this.viewHead - this.populatedTileCount;
    this.viewHead = proposedHead;
    this.removeSubSelection();
  }

  /** Changes the viewHead to the current page of undecided results */
  private async resumeVerification(): Promise<void> {
    this.viewHead = this.decisionHead;
  }

  // we ue the effective grid size here so that hidden tiles are not counted
  // when the user pages
  private async nextPage(count: number = this.effectivePageSize): Promise<void> {
    this.removeSubSelection();
    this.resetSpectrogramSettings();

    if (!this.paginationFetcher) {
      throw new Error("No paginator found.");
    }

    // the viewHead property has a setter that will cause the verification grid
    // to render the next page of spectrograms when we increase the viewHead
    this.decisionHead += count;
    this.viewHead += count;
  }

  private canNavigatePrevious(): boolean {
    return this.viewHead > 0;
  }

  private canNavigateNext(): boolean {
    return this.isViewingHistory();
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
    const requiredClassificationTags: Tag[] = this.classificationDecisionElements.map(
      (element: ClassificationComponent) => element.tag,
    );

    const verificationTiles = Array.from(this.gridTiles);
    for (const tile of verificationTiles) {
      const hasAllTags = requiredClassificationTags.every((tag) => tile.model.classifications.has(tag.text));
      if (!hasAllTags) {
        return true;
      }
    }

    return false;
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

  private renderVirtualPage(): void {
    const pageSubjects = Array.from(this.currentPage());

    // even though making a decision will cause the spectrograms to load and
    // emit the "loading" event (causing the decision buttons to be disabled)
    // there can be some input lag between when we request to change the src
    // and when the spectrograms begin to start rendering
    // I also do this first so that if the functionality below fails then the
    // user can't continue making decisions that won't be saved when downloaded
    //
    // because it is possible for the new page to be a subset of the current
    // page. E.g. when decreasing the grid size, we only want to disable the
    // decision buttons if there are going to be new spectrograms loading
    const elements = this.gridTiles;
    if (elements.length < pageSubjects.length) {
      this.setDecisionDisabled(true);
    }

    if (elements === undefined || elements.length === 0) {
      this.requestUpdate();
      return;
    }

    // if this guard condition is true, it means that we have exhausted the
    // entire data source provided by the getPage callback
    if (pageSubjects.length === 0) {
      this.requestUpdate();
      return;
    }

    // if we are on the last page, we hide the remaining elements
    const pagedDelta = elements.length - pageSubjects.length;
    if (pagedDelta > 0) {
      this.hideGridItems(pagedDelta);
    } else if (this.hiddenTiles > 0) {
      this.showAllGridItems();
      this.hiddenTiles = 0;
    }

    this.requestUpdate();
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

  private mixedTaskPromptTemplate(hasMultipleTiles: boolean, hasSubSelection: boolean) {
    if (hasSubSelection) {
      return html`<p>Make a decision about all of the selected audio segments</p>`;
    }

    if (hasMultipleTiles) {
      return "Make a decision about all of the audio segments";
    } else {
      return "Make a decision about the shown audio segment";
    }
  }

  private classificationTaskPromptTemplate(hasMultipleTiles: boolean, hasSubSelection: boolean) {
    if (hasSubSelection) {
      return "Apply labels to selected audio segments";
    }

    if (hasMultipleTiles) {
      return "Classify all relevant audio segments";
    } else {
      return "Apply a classification to the audio segment";
    }
  }

  private verificationTaskPromptTemplate(hasMultipleTiles: boolean, hasSubSelection: boolean) {
    if (hasSubSelection) {
      return "Do all of the selected audio segments have the correct applied tag";
    }

    if (hasMultipleTiles) {
      return "Do all of the audio segments have the correct applied tag";
    } else {
      return "Does the show audio segment have the correct applied tag";
    }
  }

  private decisionPromptTemplate() {
    const subSelection = this.currentSubSelection;
    const hasSubSelection = subSelection.length > 0;
    const hasMultipleTiles = this.populatedTileCount > 1;

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
      return "Are all of the selected a";
    }

    return hasMultipleTiles ? "Are all of these a" : "Is the shown spectrogram a";
  }

  //#endregion

  //#region Templates

  private noItemsTemplate(): TemplateResult<1> {
    return html`
      <div class="no-items-message">
        <p>
          <strong>No un-validated results found</strong>
        </p>
        <p>All ${this.decisionHead} annotations are validated</p>
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

      if (!this.isViewingHistory()) {
        await this.nextPage();
      }
    };

    return html`<button id="skip-button" class="oe-btn-primary" @click="${skipEventHandler}">Skip</button>`;
  }

  public render() {
    let customTemplate: any = nothing;
    if (this.gridItemTemplate) {
      customTemplate = this.gridItemTemplate.cloneNode(true);
    }

    return html`
      <oe-verification-bootstrap
        @open="${this.handleHelpDialogOpen}"
        @close="${this.handleHelpDialogClose}"
        verificationTasksCount="${this.hasVerificationTask() ? 1 : 0}"
        classificationTasksCount="${this.requiredClassificationTags.length}"
      ></oe-verification-bootstrap>
      <div id="highlight-box" @pointerup="${this.hideHighlightBox}" @pointermove="${this.resizeHighlightBox}"></div>

      <div class="verification-container">
        <div
          id="grid-container"
          class="verification-grid"
          style="--columns: ${this.columns}; --rows: ${this.rows};"
          @pointerdown="${this.renderHighlightBox}"
          @pointerup="${this.hideHighlightBox}"
          @pointermove="${this.resizeHighlightBox}"
          @overlap="${this.handleTileOverlap}"
        >
          ${when(
            this.currentPageIndices.start === this.currentPageIndices.end,
            () => this.noItemsTemplate(),
            () => html`
              ${repeat(
                this.currentPage(),
                (subject: SubjectWrapper, i: number) => html`
                  <oe-verification-grid-tile
                    class="grid-tile"
                    @loaded="${this.handleSpectrogramLoaded}"
                    .requiredDecisions="${this.requiredDecisions}"
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

        <div class="controls-container">
          <span id="element-container" class="decision-controls-left">
            <oe-verification-grid-settings></oe-verification-grid-settings>

            <button
              data-testid="help-dialog-button"
              @click="${() => this.helpDialog.showModal()}"
              class="oe-btn-info"
              rel="help"
            >
              <sl-icon name="question-circle" class="large-icon"></sl-icon>
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
              <slot @slotchange="${() => this.handleSlotChange()}"></slot>
              ${this.skipDecisionTemplate()}
            </div>
          </span>

          <span class="decision-controls-right">
            <slot name="data-source"></slot>
          </span>

          <div class="progress-bar">
            <sl-tooltip content="${this.targetGridSize > 1 ? "Previous Page" : "Previous"}">
              <button
                data-testid="previous-page-button"
                class="previous-page-button oe-btn-secondary"
                ?disabled="${!this.canNavigatePrevious()}"
                @click="${this.handlePreviousPageClick}"
              >
                &lt;
              </button>
            </sl-tooltip>

            <sl-tooltip content="${this.targetGridSize > 1 ? "Next Page" : "Next"}">
              <button
                data-testid="next-page-button"
                class="next-page-button oe-btn-secondary"
                ?disabled="${!this.canNavigateNext()}"
                @click="${this.handleNextPageClick}"
              >
                &gt;
              </button>
            </sl-tooltip>

            <oe-progress-bar
              history-head="${this.viewHead}"
              total="${ifDefined(this.paginationFetcher?.totalItems)}"
              completed="${this.decisionHead}"
            ></oe-progress-bar>
          </div>
        </div>
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
