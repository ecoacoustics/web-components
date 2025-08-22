import { customElement, property, query, queryAll, queryAssignedElements, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import {
  html,
  HTMLTemplateResult,
  LitElement,
  nothing,
  PropertyValueMap,
  PropertyValues,
  render,
  unsafeCSS,
} from "lit";
import {
  OverflowEvent,
  RequiredDecision,
  requiredNewTagPlaceholder,
  requiredVerificationPlaceholder,
  VerificationGridTileComponent,
} from "../verification-grid-tile/verification-grid-tile";
import { DecisionComponent, DecisionComponentUnion, DecisionEvent } from "../decision/decision";
import { callbackConverter, enumConverter } from "../../helpers/attributes";
import { sleep } from "../../helpers/utilities";
import { GridPageFetcher, PageFetcher } from "../../services/gridPageFetcher";
import {
  DOWN_ARROW_KEY,
  END_KEY,
  ESCAPE_KEY,
  HOME_KEY,
  LEFT_ARROW_KEY,
  PAGE_DOWN_KEY,
  PAGE_UP_KEY,
  RIGHT_ARROW_KEY,
  SPACE_KEY,
  UP_ARROW_KEY,
} from "../../helpers/keyboard";
import { SubjectWrapper } from "../../models/subject";
import { ClassificationComponent } from "../decision/classification/classification";
import { VerificationComponent } from "../decision/verification/verification";
import { Tag } from "../../models/tag";
import { provide } from "@lit/context";
import { signal, Signal } from "@lit-labs/preact-signals";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { when } from "lit/directives/when.js";
import { hasCtrlLikeModifier } from "../../helpers/userAgentData/userAgent";
import { decisionColor } from "../../services/colors";
import { ifDefined } from "lit/directives/if-defined.js";
import { DynamicGridSizeController, GridShape } from "../../helpers/controllers/dynamic-grid-sizes";
import { injectionContext, verificationGridContext } from "../../helpers/constants/contextTokens";
import { UrlTransformer } from "../../services/subjectParser";
import { VerificationBootstrapComponent } from "bootstrap-modal/bootstrap-modal";
import { IPlayEvent } from "spectrogram/spectrogram";
import { Seconds } from "../../models/unitConverters";
import { WithShoelace } from "../../mixins/withShoelace";
import { DecisionOptions } from "../../models/decisions/decision";
import { repeat } from "lit/directives/repeat.js";
import { newAnimationIdentifier, runOnceOnNextAnimationFrame } from "../../helpers/frames";
import { TagPromptComponent } from "../decision/tag-prompt/tag-prompt";
import { HeapVariable } from "../../helpers/types/advancedTypes";
import { loadingSpinnerTemplate } from "../../templates/loadingSpinner";
import { choose } from "lit/directives/choose.js";
import { cache } from "lit/directives/cache.js";
import { templateContent } from "lit/directives/template-content.js";
import verificationGridStyles from "./css/style.css?inline";

export type SelectionObserverType = "desktop" | "tablet" | "default";

export type PageOperation = <T = unknown>(subject: SubjectWrapper) => T;

/**
 * A map of new subjects to changed decisions.
 * The map is designed in this way so that you should be able to perform partial
 * updates because you know exactly what decisions were changed on a subject.
 */
export type DecisionMadeEvent = Map<SubjectWrapper, DecisionMadeEventValue>;

// Additionally, we break down each property type into a separate key so
// that we can explicitly unset the property by setting the value to `null`.
//
// The typing here is a bit complex, but can be explained as:
//
// 1. If the property is a pointer to a value it must be readonly so that
//    host applications don't accidentally modify the subject object by
//    modifying the map or object references.
//
// 2. If not a map or object, we allow an object that contains the new value for
//    each property
//
// 3. If the property was explicitly unset, we allow the value to be `null`
export type SubjectChange = {
  [K in keyof SubjectWrapper]?: SubjectWrapper[K] extends HeapVariable
    ? Readonly<SubjectWrapper[K]> | null
    : SubjectWrapper[K] | null;
};

// We emit an object as the value so that if we want to expand the emitted value
// in the future (e.g. add additional information/properties), we do not have to
// do a breaking change.
export interface DecisionMadeEventValue {
  change: SubjectChange;

  /**
   * @deprecated
   * This property is subject to removal and is a hacky escape hatch that was
   * used to determine the previous values of the subject properties that were
   * deleted so that API calls can correctly make DELETE requests on old
   * out-dated sub-models such as decisions.
   *
   * This should be replaced with a more robust solution once the decision-made
   * spec has been finalized.
   * https://github.com/ecoacoustics/web-components/issues/448
   */
  oldSubject: SubjectWrapper;
}

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

/**
 * @description
 * An enum that contains all of the possible values the "progress-bar-position"
 * attribute ("progressBarPosition" property) accepts.
 *
 * @example
 * ```js
 * const verificationGrid = document.GetElementById("verification-grid");
 * verificationGrid.progressBarPosition = ProgressBarPosition.TOP;
 * ```
 */
export enum ProgressBarPosition {
  TOP = "top",
  BOTTOM = "bottom",
  HIDDEN = "hidden",
}

export enum LoadState {
  LOADING = "loading",
  FETCHED = "fetched",
  LOADED = "loaded",
  ERROR = "error",
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
  pointerId: number | null;
  capturedPointer: boolean;

  // We store the highlight host in the HighlightSelection object for two
  // reasons.
  //
  // 1. We cannot always attach to the <body> element because poorly created
  //    webpages might not have a <body> element.
  // 2. We store a reference to the element so that we can correctly detach the
  //    event listener when this component is removed from the DOM.
  //    If we did not store a reference to the element and instead used a getter
  //    to find what element the highlight is attached to, if the original
  //    highlight host is removed from the DOM, the re-queried element would be
  //    different. Meaning we wouldn't be able to remove the event listeners
  //    from the original highlight host and there would be a memory leak.
  highlightHost: HTMLElement;

  // we store the observed elements in an array so that we don't re-query the
  // DOM for the grid tiles every time the highlight box is resized
  //! Warning: be sure to update this array if grid tiles are added/removed
  observedElements: VerificationGridTileComponent[];
}

interface CurrentPage {
  start: number;
  end: number;
}

interface SelectionOptions {
  additive?: boolean;
  toggle?: boolean;
  range?: boolean;
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
 * @event { DecisionMadeEvent } decision-made - Emits information about a batch of decisions that was made
 * @event grid-loaded - Emits when all the spectrograms have been loaded
 */
@customElement("oe-verification-grid")
export class VerificationGridComponent extends WithShoelace(AbstractComponent(LitElement)) {
  public static styles = unsafeCSS(verificationGridStyles);

  public static readonly decisionMadeEventName = "decision-made";
  private static readonly loadedEventName = "grid-loaded";
  private static readonly autoPageTimeout = 0.3 satisfies Seconds;

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

  @property({ attribute: "empty-subject-message", type: String })
  public emptySubjectText = "No content";

  @property({
    attribute: "progress-bar-position",
    type: String,
    converter: enumConverter(ProgressBarPosition, ProgressBarPosition.BOTTOM),
  })
  public progressBarPosition: ProgressBarPosition = ProgressBarPosition.BOTTOM;

  /** A callback function that returns a page of recordings */
  @property({ attribute: "get-page", type: Function, converter: callbackConverter })
  public getPage?: PageFetcher;

  /**
   * A callback function that will be applied to all subject urls
   *
   * @default
   * an identity function that returns the url unchanged
   */
  @property({ attribute: "url-transformer", type: Function, converter: callbackConverter })
  public urlTransformer: UrlTransformer = (url) => url;

  @property({ type: Boolean })
  public autofocus = false;

  /** selector for oe-verification elements */
  @queryAssignedElements({ selector: "oe-verification" })
  private verificationDecisionElements!: VerificationComponent[];

  /** selector for oe-classification elements */
  @queryAssignedElements({ selector: "oe-classification" })
  private classificationDecisionElements!: ClassificationComponent[];

  /** selector for oe-classification elements */
  @queryAssignedElements({ selector: "oe-tag-prompt" })
  private tagPromptDecisionElements!: TagPromptComponent[];

  /** A selector for all oe-verification and oe-classification elements */
  @queryAssignedElements({ selector: "oe-verification, oe-classification, oe-tag-prompt, oe-skip" })
  private decisionElements!: DecisionComponentUnion[];

  // Because it's possible (although unlikely) for multiple skip buttons to
  // exist on a page, this query selector returns an array of elements.
  @queryAssignedElements({ selector: "oe-verification[verified='skip'], oe-skip" })
  private skipButtons!: DecisionComponent[];

  @queryDeeplyAssignedElement({ selector: "template" })
  private gridItemTemplate?: HTMLTemplateElement;

  @queryAll("oe-verification-grid-tile")
  private gridTiles!: NodeListOf<VerificationGridTileComponent>;

  @query("oe-verification-bootstrap")
  private bootstrapDialog!: VerificationBootstrapComponent;

  @query("#grid-container")
  private gridContainer!: HTMLDivElement;

  @query("#decisions-container")
  private decisionsContainer!: HTMLDivElement;

  @query("#highlight-box")
  private highlightBox!: HTMLDivElement;

  @state()
  public columns = this.targetGridSize;

  @state()
  public rows = 1;

  @state()
  public loadState: LoadState = LoadState.LOADING;

  @state()
  private currentSubSelection: SubjectWrapper[] = [];

  @state()
  private viewHead = 0;

  @state()
  private decisionHeadIndex = 0;

  public get gridShape(): GridShape {
    return { columns: this.columns, rows: this.rows };
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

  private get emptyTileCount() {
    const availableTiles = this.rows * this.columns;
    const visibleSubjectCount = this.currentPageIndices.end - this.currentPageIndices.start;
    return availableTiles - visibleSubjectCount;
  }

  /**
   * Returns the current users selection behavior, collapsing the "default"
   * behavior into either "tablet" or "desktop" depending on the users device
   * type.
   */
  private get userSelectionBehavior(): SelectionObserverType {
    if (this.selectionBehavior === "default") {
      return this.isMobileDevice() ? "tablet" : "desktop";
    }

    return this.selectionBehavior;
  }

  private keydownHandler = this.handleKeyDown.bind(this);
  private keyupHandler = this.handleKeyUp.bind(this);
  private blurHandler = this.handleWindowBlur.bind(this);
  private selectionHandler = this.handleTileSelection.bind(this);
  private decisionHandler = this.handleDecision.bind(this);

  private pointerDownHandler = this.renderHighlightBox.bind(this);
  private pointerUpHandler = this.hideHighlightBox.bind(this);
  private pointerMoveHandler = this.handlePointerMove.bind(this);

  public subjects: SubjectWrapper[] = [];

  /**
   * "single decision mode" will automatically advance the selection head if:
   *    1. There is only one tile selected
   *    2. All tasks on the selected tile is completed
   *
   * A user can enter this mode at any time by selecting just one tile.
   * They remain in the mode by completing all tasks on the single selected
   * tile, at which point the selection is advanced.
   * Once in this mode, there is some special functionality like the first tile
   * of each new page being automatically selected.
   */
  private singleDecisionMode = false;

  private requiredClassificationTags: Tag[] = [];
  private requiredDecisions: RequiredDecision[] = [];
  private hiddenTiles = 0;
  private showingSelectionShortcuts = false;
  private anyOverlap = signal<boolean>(false);
  private gridController?: DynamicGridSizeController<HTMLDivElement>;
  private paginationFetcher?: GridPageFetcher;

  private highlightSelectionAnimation = newAnimationIdentifier("highlight-selection");
  private highlight: HighlightSelection = {
    start: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    highlighting: false,
    pointerId: null,
    capturedPointer: false,
    observedElements: [],

    // Poorly created webpages may not have a body element.
    // In this case, we should use the component host as the highlight host.
    //
    // I store the highlight host in the highlight object so if a <body> tag
    // is dynamically added/removed from the page, we will maintain the same
    // highlight host and not leak event listeners.
    highlightHost: document.body ?? this,
  };

  private focusHead: number | null = null;
  private _rangeSelectionHead: number | null = null;

  /**
   * Where range selection will start from.
   * This pointer moves independently from the focus head.
   */
  private get rangeSelectionHead() {
    return this._rangeSelectionHead;
  }

  private set rangeSelectionHead(value: number | null) {
    // Note that the bounds check upper limit is the populated tile count
    // subtract one.
    // This is because the populatedTileCount is indexed from 1 while the range
    // selection value is indexed from 0.
    const upperBound = this.lastTileIndex;
    const isInBounds = value === null || (value >= 0 && value <= upperBound);
    if (!isInBounds) {
      console.error(`new range selection value: '${value}' is not valid. Value must be in range [0,${upperBound}]`);
      return;
    }

    this._rangeSelectionHead = value;

    // When unsetting the selection head (e.g. with ESC key) we want to keep the
    // focus head at the same index, so that if you start moving again, it will
    // start from where the current focus head is (where you deselected from).
    if (value !== null) {
      this.focusHead = value;
    }
  }

  private get nextLeftIndex(): number {
    return this.focusHead === null ? 0 : Math.max(this.focusHead - 1, 0);
  }

  private get nextRightIndex(): number {
    return this.focusHead === null ? 0 : Math.min(this.focusHead + 1, this.lastTileIndex);
  }

  private get nextUpIndex(): number {
    if (this.focusHead === null) {
      return 0;
    }

    // If the selection head is on the top row, pressing up should have no
    // action.
    const proposedIndex = this.focusHead - this.columns;
    if (proposedIndex < 0) {
      return this.focusHead;
    }

    return proposedIndex;
  }

  private get nextDownIndex(): number {
    if (this.focusHead === null) {
      return 0;
    }

    // If the selection head is on the last row, pressing down should have no
    // action.
    const proposedIndex = this.focusHead + this.columns;
    if (proposedIndex > this.lastTileIndex) {
      return this.focusHead;
    }

    return proposedIndex;
  }

  private get lastTileIndex(): number {
    return this.populatedTileCount - 1;
  }

  // This overrides the element's focus() method so that it focuses the grid
  // tiles instead of the component host.
  // This allows host applications to focus the grid container at the level
  // where event listeners and tab index's are correctly scoped.
  public override focus() {
    this.gridContainer.focus();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("keydown", this.keydownHandler);
    this.addEventListener("keyup", this.keyupHandler);
    window.addEventListener("blur", this.blurHandler);

    this.highlight.highlightHost.addEventListener("pointerdown", this.pointerDownHandler);
    this.highlight.highlightHost.addEventListener("pointerup", this.pointerUpHandler);
    this.highlight.highlightHost.addEventListener("pointermove", this.pointerMoveHandler);
  }

  public disconnectedCallback(): void {
    this.removeEventListener("keydown", this.keydownHandler);
    this.removeEventListener("keyup", this.keyupHandler);
    window.removeEventListener("blur", this.blurHandler);

    // I don't need an elvis operator here in the case that the host application
    // removes the <body> element because the highlight object + event listener
    // will stop the <body> element node reference from being garbage collected.
    this.highlight.highlightHost.removeEventListener("pointerdown", this.pointerDownHandler);
    this.highlight.highlightHost.removeEventListener("pointerup", this.pointerUpHandler);
    this.highlight.highlightHost.removeEventListener("pointermove", this.pointerMoveHandler);

    this.gridContainer.removeEventListener<any>(VerificationGridTileComponent.selectedEventName, this.selectionHandler);
    this.decisionsContainer.removeEventListener<any>(DecisionComponent.decisionEventName, this.decisionHandler);

    super.disconnectedCallback();
  }

  public isViewingHistory(): boolean {
    // we know that the user is viewing history if the subjectBuffer index
    // currently being displayed is less than where the user has verified up to
    return this.viewHead + (this.populatedTileCount - 1) < this.decisionHead;
  }

  public resetSpectrogramSettings(): void {
    for (const tile of this.gridTiles) {
      tile.resetSettings();
    }
  }

  public isBootstrapDialogOpen(): boolean {
    return this.bootstrapDialog.open;
  }

  // to use regions in VSCode, press Ctrl + Shift + P > "Fold"/"Unfold"
  //#region Updates

  public firstUpdated(): void {
    this.gridContainer.addEventListener<any>(VerificationGridTileComponent.selectedEventName, this.selectionHandler);
    this.decisionsContainer.addEventListener<any>(DecisionComponent.decisionEventName, this.decisionHandler);

    // if the user has explicitly set a grid size through the `grid-size`
    // attribute, we should use that grid size
    // however, if the verification grid does not have a `grid-size` attribute
    // then we look at our grid size breakpoints to determine the grid size
    // that will fit the best on the screen
    if (!this.targetGridSize) {
      const targetSize = this.defaultGridSize();
      this.targetGridSize = targetSize;
    }

    if (this.skipButtons.length === 0) {
      render(this.skipDecisionTemplate(), this);
    }

    if (this.autofocus) {
      this.focus();
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
      if (!isFinite(newGridSize)) {
        this.targetGridSize = oldGridSize;
        console.error(`Grid size '${newGridSize}' could not be converted to a finite number.`);
      } else if (newGridSize <= 0) {
        this.targetGridSize = oldGridSize;
        console.error(`Grid size '${newGridSize}' must be a positive number.`);
      }
    }
  }

  protected async updated(change: PropertyValueMap<this>): Promise<void> {
    if (this.gridContainer && change.has("targetGridSize")) {
      this.gridController ??= new DynamicGridSizeController(this.gridContainer, this, this.anyOverlap);
      this.gridController.setTarget(this.targetGridSize);
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
    // of sources to update / remove un-needed items.
    //
    // However, if the new grid size is less than the current grid size, we
    // don't want to invalidate the page because that would produce unnecessary
    // work.
    const pageInvalidationKeys: (keyof this)[] = ["targetGridSize", "columns", "rows"];
    if (pageInvalidationKeys.some((key) => change.has(key))) {
      const oldColumns = change.get("columns") ?? this.columns;
      const oldRows = change.get("rows") ?? this.rows;

      const oldGridSize = oldColumns * oldRows;
      const oldTileCount = Math.min(oldGridSize, this.targetGridSize);

      if (oldTileCount > this.populatedTileCount) {
        if (this.areTilesLoaded()) {
          this.loadState = LoadState.LOADED;
          this.dispatchEvent(new CustomEvent(VerificationGridComponent.loadedEventName));
          this.updateDecisionWhen();
        }
      }

      this.updateSubSelection();
    }

    // tile invalidations cause the functionality of the tiles to change
    // however, they do not cause the spectrograms or the template to render
    const tileInvalidationKeys: (keyof this)[] = ["selectionBehavior"];
    if (tileInvalidationKeys.some((key) => change.has(key))) {
      this.handleTileInvalidation();
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
    const isMobile = this.isMobileDevice();

    // I store the decision elements inside a variable so that we don't have
    // to query the DOM every iteration of the loop
    const decisionElements = this.decisionElements ?? [];
    for (const element of decisionElements) {
      element.isMobile = isMobile;
    }

    this.bootstrapDialog.decisionElements = decisionElements;

    // we remove the current sub-selection last so that if the change fails
    // there will be no feedback to the user that the operation succeeded
    this.clearSelection();
  }

  /**
   * handles the data source of the verification grid changing
   * this will reset the verification task and re-fetch the first page of
   * subjects from the new data source
   */
  private async handleGridSourceInvalidation() {
    if (this.getPage) {
      this.paginationFetcher = new GridPageFetcher(this.getPage, this.urlTransformer);
      await this.resetBufferHeads();
    }

    // After changing the data source, we want to remove the current
    // sub-selection for multiple reasons:
    // 1. It provides a UX hint that something has changed and there is a new
    //    task
    //
    // 2. For SPA host's where the verification grid might be re-used between
    //    tasks, we want to provide a fresh verification grid between distinct
    //    tasks.
    //
    // 3. As a defensive programming measure, we should reset the state, so that
    //    we don't end up in undefined behavior.
    //    While I have never seen a bug that was caused by not de-selecting the
    //    grid in-between data-sources, it's a good defensive programming
    //    practice to reset state in cases such as this, because the behavior
    //    hasn't been explicitly defined.
    this.clearSelection();

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

  private async resetBufferHeads() {
    this.subjects = [];

    await this.setViewHead(0);
    this.decisionHead = 0;

    // While every subject has a decision, we keep paging through the data
    // until we find the first page that does not have complete decisions.
    //
    // When we find a page that does not have complete decisions, we stop and
    // set the decision head.
    //
    // Because we always start the view head at 0, we can start rendering the
    // first page immediately without having to wait for the decision head
    // location.
    // Therefore, we can perform this operation asynchronously and not block
    // the UI.
    new Promise<void>(async (res) => {
      let virtualDecisionHead = 0;
      while (true) {
        const virtualPage = await this.viewHeadItems(virtualDecisionHead);
        if (virtualPage.length === 0) {
          break;
        }

        const isPageIncomplete = virtualPage.some((subject) =>
          subject.hasOutstandingDecisions(
            this.hasVerificationTask(),
            this.hasNewTagTask(),
            this.requiredClassificationTags,
          ),
        );

        if (isPageIncomplete) {
          break;
        }

        virtualDecisionHead += this.populatedTileCount;
      }

      this.decisionHead = virtualDecisionHead;
      res();
    });
  }

  private updateRequiredDecisions(): void {
    let foundVerification = false;
    const result: RequiredDecision[] = [];

    // We iterate over all of the decision elements (including verification
    // components) so that the button placement order is preserved.
    // If were to use the "hasVerificationTask" getter, the verification task
    // segment would be appended to either the start or the end.
    for (const decisionElement of this.decisionElements) {
      if (decisionElement instanceof VerificationComponent && decisionElement.isTask && !foundVerification) {
        foundVerification = true;
        result.push(requiredVerificationPlaceholder);
      } else if (decisionElement instanceof TagPromptComponent) {
        result.push(requiredNewTagPlaceholder);
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

  private *currentPage(): Generator<SubjectWrapper | null, void, void> {
    const page = this.currentPageIndices;
    for (let i = page.start; i < page.end; i++) {
      yield this.subjects[i];
    }

    // If there are any additional empty tiles, we emit a "null" value to
    // so that we can render a placeholder.
    for (let i = 0; i < this.emptyTileCount; i++) {
      yield null;
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
    const isHoldingCtrl = hasCtrlLikeModifier(event);
    const selectionOptions: SelectionOptions = {
      toggle: isHoldingCtrl,
      range: event.shiftKey,
    };

    // While holding control, only move the focus, don't change the selection.
    const keySelectionHandler = isHoldingCtrl ? this.focusTile.bind(this) : this.processSelection.bind(this);

    switch (event.key) {
      case PAGE_DOWN_KEY: {
        event.preventDefault();
        this.handleNextPageClick();
        break;
      }

      case PAGE_UP_KEY: {
        event.preventDefault();
        this.handlePreviousPageClick();
        break;
      }

      case HOME_KEY: {
        event.preventDefault();
        keySelectionHandler(0, selectionOptions);
        break;
      }

      case END_KEY: {
        event.preventDefault();
        keySelectionHandler(this.lastTileIndex, selectionOptions);
        break;
      }

      case LEFT_ARROW_KEY: {
        event.preventDefault();
        keySelectionHandler(this.nextLeftIndex, selectionOptions);
        break;
      }

      case RIGHT_ARROW_KEY: {
        event.preventDefault();
        keySelectionHandler(this.nextRightIndex, selectionOptions);
        break;
      }

      case UP_ARROW_KEY: {
        event.preventDefault();
        keySelectionHandler(this.nextUpIndex, selectionOptions);
        break;
      }

      case DOWN_ARROW_KEY: {
        event.preventDefault();
        keySelectionHandler(this.nextDownIndex, selectionOptions);
        break;
      }

      // if the user is holding down both ctrl and D, we should remove the
      // current selection (this is a common behavior in other applications)
      case "d": {
        if (isHoldingCtrl) {
          // in Chrome and FireFox, Ctrl + D is a browser shortcut to bookmark
          // the current page. We prevent default so that the user can use
          // ctrl + D to remove the current selection
          event.preventDefault();

          // We reset the selection head so that if the user deselects all of the
          // tiles (e.g. through the esc key), the next shift click will start a new
          // range selection instead of starting from the old range selection
          // position.
          this.clearSelection();
        }
        break;
      }

      case "a": {
        if (isHoldingCtrl) {
          // we prevent default on the ctrl + A event so that chrome doesn't
          // select all the text on the page
          event.preventDefault();
          this.subSelectAll();
        }
        break;
      }

      case "?": {
        this.handleHelpRequest();
        break;
      }

      // We don't handle the de-selection case here because we have deemed that
      // de-selection on keyup is more intuitive.
      // However, we have to preventDefault on the keydown because in some
      // browsers (e.g. Chrome), pressing escape while the page is loading will
      // cause the browser to stop page load.
      // Therefore, if the user starts selecting the grid tiles before the page
      // load finishes, and presses escape to de-select tiles, we don't want to
      // cancel the page load.
      case ESCAPE_KEY: {
        // Pressing escape while the page is loading will cause some browsers
        // (e.g. Chrome) to stop loading the page.
        // We preventDefault so that if the user makes a selection before the
        // page/spectrograms had loaded, and then presses escape to remove the
        // selection, it doesn't stop the page from loading, and break the
        // verification grid.
        event.preventDefault();
        break;
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // we bind the escape key to keyUp because MacOS doesn't trigger keydown
    // events when the escape key is pressed
    // related to: https://stackoverflow.com/a/78872316
    if (event.key === ESCAPE_KEY) {
      // We reset the selection head so that if the user deselects all of the
      // tiles (e.g. through the esc key), the next shift click will start a new
      // range selection instead of starting from the old range selection
      // position.
      this.clearSelection();
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

  /**
   * Catches a verification grid tiles play event, and conditionally cancels it
   * based on the current selection state.
   *
   * Reminder: The play shortcut is listened for by each media-controls, so this
   * handler runs grid size times when the play shortcut is pressed.
   */
  private handleTilePlay(event: CustomEvent<IPlayEvent>): void {
    // If all of the tiles are selected (either through explicit selection or
    // implicitly by having everything de-selected), then we want to play
    // everything so don't cancel any of the play events.
    // This is handled here and not in the tiles, because the tile's don't know the total
    // selected count.
    if (this.currentSubSelection.length === this.effectivePageSize) {
      return;
    }

    const eventTarget = event.target;
    if (!(eventTarget instanceof VerificationGridTileComponent)) {
      console.error("Received play event request from non-tile element");
      return;
    }

    // but if some are selected, then cancel the play event for only those that
    // aren't selected
    if (!eventTarget.selected && event.detail.keyboardShortcut) {
      event.preventDefault();
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

  private handleHelpRequest(): void {
    // if the user is on a mobile device, there is no use showing the advanced
    // shortcuts because the user cannot use them
    // therefore, if the user clicks the help button on a mobile device
    // we take them directly to the onboarding modal
    if (this.isMobileDevice()) {
      this.bootstrapDialog.showTutorialDialog();
    } else {
      this.bootstrapDialog.showAdvancedDialog();
    }
  }

  private handleBootstrapDialogOpen(): void {
    this.gridContainer.removeEventListener<any>(VerificationGridTileComponent.selectedEventName, this.selectionHandler);
    this.decisionsContainer.removeEventListener<any>(DecisionComponent.decisionEventName, this.decisionHandler);
  }

  private handleBootstrapDialogClose(): void {
    this.gridContainer.addEventListener<any>(VerificationGridTileComponent.selectedEventName, this.selectionHandler);
    this.decisionsContainer.addEventListener<any>(DecisionComponent.decisionEventName, this.decisionHandler);

    if (this.autofocus) {
      this.focus();
    }
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

  private handlePointerMove(event: PointerEvent): void {
    runOnceOnNextAnimationFrame(this.highlightSelectionAnimation, () => this.resizeHighlightBox(event));
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

  /**
   * An event handler for the verification-grid-tile's "oe-selected" event.
   * This handles alt + number selection, and click selection.
   */
  private handleTileSelection(selectionEvent: SelectionEvent): void {
    const options: SelectionOptions = {
      toggle: selectionEvent.detail.ctrlKey,
      range: selectionEvent.detail.shiftKey,
    };

    this.processSelection(selectionEvent.detail.index, options);
  }

  private toggleTileSelection(index: number): void {
    const targetGridTile = this.gridTiles[index];
    targetGridTile.selected = !targetGridTile.selected;
    this.focusTile(index);
  }

  private selectTile(index: number): void {
    const targetGridTile = this.gridTiles[index];
    targetGridTile.selected = true;
    this.focusTile(index);
  }

  private focusTile(index: number): void {
    const targetGridItem = this.gridTiles[index];
    targetGridItem.focus();
    this.focusHead = index;
  }

  private addSubSelectionRange(start: number, end: number): void {
    this.focusTile(end);

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

    this.updateSubSelection();
  }

  private canSubSelect(): boolean {
    // we check that the bootstrap dialog is not open so that the user doesn't
    // accidentally create a sub-selection (e.g. through keyboard shortcuts)
    // when they can't actually see the grid items
    return this.populatedTileCount > 1 && !this.isBootstrapDialogOpen();
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
    const selectedTiles = gridTiles.filter((tile) => tile.selected);

    if (selectedTiles.length === 0) {
      this.currentSubSelection = gridTiles.map((tile) => tile.model);
    } else {
      this.currentSubSelection = selectedTiles.map((tile) => tile.model);
    }

    this.updateDecisionWhen();
  }

  /**
   * A common method that can be used to create consistent selection behavior
   * across the different selection methods (click, alt, arrow, tab & highlight)
   */
  private processSelection(
    tileIndices: number | number[],
    { additive = false, toggle = false, range = false }: SelectionOptions = {},
  ): void {
    if (!this.canSubSelect()) {
      return;
    }

    // If you want to set "singleDecisionMode", you will need to set it after
    // selection has succeeded/failed.
    this.singleDecisionMode = false;

    // in desktop mode, unless the ctrl key is held down, clicking an element
    // removes all other selected items
    // while it is not possible to press the ctrl key on a tablet, the user can
    // still overwrite the selection behavior using the selection-behavior
    // attribute. Therefore, we have to check that we are not on explicitly
    // using tablet selection mode.
    if (this.userSelectionBehavior === "desktop" && !toggle && !additive) {
      this.removeSubSelection();
    }

    const iterableIndices = Array.isArray(tileIndices) ? tileIndices : [tileIndices];
    for (const tileIndex of iterableIndices) {
      if (range) {
        // if the user has never selected an item before, the multiSelectHead
        // will be "null" in this case, we want to start selecting from the
        // first tile of the verification grid.
        // This is the behavior seen in Windows file explorer.
        this.rangeSelectionHead ??= 0;
        const selectionTail = tileIndex;

        this.addSubSelectionRange(this.rangeSelectionHead, selectionTail);
      } else if (additive) {
        this.selectTile(tileIndex);
        this.rangeSelectionHead = tileIndex;
      } else {
        // if we reach this point, we know that the user is not performing a
        // range selection because range selection performs an early return
        this.toggleTileSelection(tileIndex);
        this.rangeSelectionHead = tileIndex;
      }
    }

    this.updateSubSelection();
  }

  private resetSelectionHead(): void {
    this.rangeSelectionHead = null;
  }

  private clearSelection(): void {
    this.removeSubSelection();
    this.resetSelectionHead();
    this.hideHighlightBox();
  }

  private updateSelectionHead(value: number | null, options?: SelectionOptions): void {
    const refinedOptions: SelectionOptions = {
      range: options?.range,
    };

    if (value !== null) {
      this.processSelection(value, refinedOptions);
    } else {
      this.removeSubSelection();
    }
  }

  private moveSelectionHeadToNextUndecided(selectionIndex: number): void {
    // Find both the first undecided tile, and the next undecided tile after the
    // current selection.
    // The first undecided will be different if the user has undecided tiles
    // before the current selection.
    let firstUndecidedTile: number | null = null;
    const nextUndecidedTile = Array.from(this.gridTiles).findIndex((tile, index) => {
      // We include the current index in the undecided tile check, so that if
      // the current tile that the user is on is still undenied, we will stay
      // on the current tile.
      // Note that you should not be calling this function if the current tile
      // is incomplete, but this is a defensive programming / double check to
      // ensure that we don't skip over the currently incomplete tile.
      if (index < selectionIndex) {
        if (firstUndecidedTile === null && !tile.taskCompleted) {
          firstUndecidedTile = index;
        }

        return false;
      }

      return !tile.taskCompleted;
    });

    // nextUndecidedTile will have a value of -1 if there are no undecided tiles
    // ahead of the current selection head (because I am using findIndex).
    const nextSelection = nextUndecidedTile !== -1 ? nextUndecidedTile : firstUndecidedTile;
    this.updateSelectionHead(nextSelection);
  }

  private selectFirstTile(options?: SelectionOptions): void {
    this.updateSelectionHead(0, options);
  }

  private async viewHeadItems(viewHead: number): Promise<SubjectWrapper[]> {
    if (!this.paginationFetcher) {
      console.error("Cannot set viewHead because the paginationFetcher is not initialized");
      return [];
    }

    const needsMoreSubjects = viewHead > this.viewHead || this.viewHead === 0;
    if (needsMoreSubjects) {
      let enoughToRenderResolver: () => void;
      const enoughToRender = new Promise<void>((resolve) => {
        enoughToRenderResolver = resolve;
      });

      const subjectReader = await this.paginationFetcher.nextSubjects(
        this.decisionHead,
        this.populatedTileCount,
        this.subjects.length,
      );

      subjectReader.pipeTo(
        new WritableStream({
          write: (subject: SubjectWrapper[]) => {
            this.subjects.push(...subject);

            if (this.subjects.length >= viewHead + this.targetGridSize) {
              // if we have enough subjects to render the page, we resolve the
              // promise so that the viewHead can be set
              enoughToRenderResolver();
            }
          },
          close: () => {
            // because the viewHead is an index into the "subjects" array, it
            // cannot be larger than the length of the subjects array.
            // If we receive a value that is larger than the subjects buffer,
            // we emit an error so we can catch it in dev, and use the subject
            // arrays length as a fallback to prevent hard-failing.
            const availableSubjectsCount = this.subjects.length;
            if (availableSubjectsCount < viewHead) {
              console.error("Attempted to set the viewHead to a value larger than the subjects array");
              viewHead = availableSubjectsCount;
            }

            this.paginationFetcher?.refreshCache(this.subjects, this.decisionHead);

            enoughToRenderResolver();
          },
        }),
      );

      await enoughToRender;
    }

    return this.subjects.slice(viewHead, viewHead + this.populatedTileCount);
  }

  private async setViewHead(value: number): Promise<void> {
    // If the viewHead will not change, I do not perform any updates because we
    // might end up in an unexpected state.
    // Note that I have never seen this condition trigger, but it is a
    // defensive programming measure.
    if (value === this.viewHead && this.viewHead !== 0) {
      return;
    }

    let clampedHead = Math.min(Math.max(0, value), this.decisionHead);

    await this.viewHeadItems(clampedHead);

    this.viewHead = clampedHead;
    this.setDecisionDisabled(true);

    // Changing the loadState will cause an update because the loadState is a
    // tracked state meaning that we don't have to manually invoke
    // requestUpdate which would end up being debounced anyways.
    if (this.loadState === LoadState.LOADING) {
      this.loadState = LoadState.FETCHED;
    } else {
      this.requestUpdate();
    }
  }

  //#endregion

  //#region SelectionBoundingBox

  private renderHighlightBox(event: PointerEvent): void {
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

      this.updateHighlightObservedElements();

      const { pageX, pageY } = event;
      this.highlight.start = { x: pageX, y: pageY };

      this.highlight.pointerId = event.pointerId;
      this.highlight.capturedPointer = false;
    }
  }

  private updateHighlightObservedElements(): void {
    this.highlight.observedElements = Array.from(this.gridTiles);
  }

  private resizeHighlightBox(event: PointerEvent): void {
    if (!this.highlight.highlighting) {
      return;
    }

    const highlightBoxElement = this.highlightBox;

    const { pageX, pageY } = event;
    this.highlight.current = { x: pageX, y: pageY };

    const highlightWidth = this.highlight.current.x - this.highlight.start.x;
    const highlightHeight = this.highlight.current.y - this.highlight.start.y;

    const transformX = this.highlight.start.x + Math.min(highlightWidth, 0);
    const transformY = this.highlight.start.y + Math.min(highlightHeight, 0);

    // If the user selects from the right to the left, we change the position
    // of the highlight box to so that the top left of the highlight box is
    // always aligned with the users pointer.
    //
    // We use "transform" (instead of left & top) so that there is zero layout
    // shift or layout recalculation when moving the highlight box.
    highlightBoxElement.style.transform = `translate(${transformX}px, ${transformY}px)`;

    // the highlights width / height can be negative if the user drags to the
    // top or left of the screen
    highlightBoxElement.style.width = `${Math.abs(highlightWidth)}px`;
    highlightBoxElement.style.height = `${Math.abs(highlightHeight)}px`;

    const highlightXDelta = Math.abs(highlightWidth);
    const highlightYDelta = Math.abs(highlightHeight);
    const highlightThreshold = 15;
    const meetsHighlightThreshold = Math.max(highlightXDelta, highlightYDelta) > highlightThreshold;
    if (meetsHighlightThreshold) {
      highlightBoxElement.style.display = "inline-block";
      if (!this.highlight.capturedPointer && this.highlight.pointerId !== null) {
        document.body.setPointerCapture(this.highlight.pointerId);
      }

      // This mimics the behavior of Windows explorer where de-selecting items
      // during drag-selection only occurs during the initial draw of the
      // selection box.
      const maintainSelection = hasCtrlLikeModifier(event) || event.shiftKey;
      if (!maintainSelection) {
        this.removeSubSelection();
      }
    } else {
      return;
    }

    // We mimic the selection behavior of windows explorer where the selection
    // is always additive.
    //
    // Note that Windows explorer will deselect tiles if you do not hold down
    // ctrl or shift during the initial mousedown event, but you can lift the
    // ctrl of shift key while highlighting.
    const options: SelectionOptions = {
      additive: true,
    };

    const intersectingTiles = this.calculateHighlightIntersection();

    // If the user drags from the right to the left, we have a "negative
    // selection".
    // In this case, we want to select the tiles in reverse order (in the same
    // order that the user selected them).
    // This is done so that the correct focus order is maintained, and any
    // future selection order behavior is automatically implemented.
    const isNegativeSelection = highlightWidth < 0;
    if (isNegativeSelection) {
      intersectingTiles.reverse();
    }

    const tileIndices = intersectingTiles.map((tile) => tile.index);
    this.processSelection(tileIndices, options);
  }

  private calculateHighlightIntersection(): VerificationGridTileComponent[] {
    const selectionLeftSide = Math.min(this.highlight.start.x, this.highlight.current.x);
    const selectionTopSide = Math.min(this.highlight.start.y, this.highlight.current.y);

    const selectionRightSide = Math.max(this.highlight.start.x, this.highlight.current.x);
    const selectionBottomSide = Math.max(this.highlight.start.y, this.highlight.current.y);

    return this.highlight.observedElements.filter((target) => {
      const targetTop = target.offsetTop;
      const targetBottom = targetTop + target.offsetHeight;
      const targetLeft = target.offsetLeft;
      const targetRight = targetLeft + target.offsetWidth;

      const isOverlapping =
        targetLeft <= selectionRightSide &&
        targetRight >= selectionLeftSide &&
        targetTop <= selectionBottomSide &&
        targetBottom >= selectionTopSide;

      return isOverlapping;
    });
  }

  private hideHighlightBox(): void {
    if (!this.highlight.highlighting) {
      return;
    }

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

    this.highlightBox.style.display = "none";
    if (this.highlight.pointerId !== null) {
      document.body.releasePointerCapture(this.highlight.pointerId);
      this.highlight.pointerId = null;
    }
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
    this.setViewHead(proposedViewHead);
    this.clearSelection();
  }

  private pageBackward(): void {
    // the new viewHead value is only a proposal for the viewHead setter
    // because the viewHead setter might reject the new value if it is less
    // than zero or exceeds the length of the subjects array
    const proposedHead = this.viewHead - this.populatedTileCount;
    this.setViewHead(proposedHead);
    this.clearSelection();
  }

  /** Changes the viewHead to the current page of undecided results */
  private async resumeVerification(): Promise<void> {
    this.setViewHead(this.decisionHead);
    this.clearSelection();
  }

  // we use the effective grid size here so that hidden tiles are not counted
  // when the user pages
  private async pageNext(count: number = this.effectivePageSize) {
    this.clearSelection();
    this.resetSpectrogramSettings();

    this.decisionHead += count;
    await this.setViewHead(this.viewHead + count);
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
    // decision keyboard shortcuts while the bootstrap dialog is open
    if (this.isBootstrapDialogOpen()) {
      return;
    }

    // userDecisions is an array because a single decision could have multiple
    // implicit decisions.
    // E.g. When a verification button with additional tags is clicked, it will
    // emit one verification and multiple classification decisions.
    const userDecisions = event.detail.value;

    const gridTiles = Array.from(this.gridTiles);
    const subSelection = gridTiles.filter((tile) => tile.selected);
    const hasSubSelection = subSelection.length > 0;
    const trueSubSelection = hasSubSelection ? subSelection : gridTiles;

    const decisionMap: DecisionMadeEvent = new Map();

    const emittedSubjects: SubjectWrapper[] = [];
    for (const tile of trueSubSelection) {
      if (tile.hidden) {
        continue;
      }

      // TODO: Remove this subject copy once we have an finalized spec to
      // represent the old value of properties that were unset.
      // see: https://github.com/ecoacoustics/web-components/issues/448
      const oldSubject = Object.assign({}, tile.model);
      let tileChanges = {};

      for (const decision of userDecisions) {
        // Skip decisions have some special behavior.
        // If nothing is selected, a skip decision will skip all undecided tiles.
        // If the user does have a subsection, we only apply the skip decision to
        // the selected tiles.
        if (decision.confirmed === DecisionOptions.SKIP) {
          const skipChanges = tile.model.skipUndecided(
            this.hasVerificationTask(),
            this.hasNewTagTask(),
            this.requiredClassificationTags,
          );

          tileChanges = { ...tileChanges, ...skipChanges };

          continue;
        }

        // for each decision [button] we have a toggling behavior where if the
        // decision is not present on a tile, then we want to add it and if the
        // decision is already present on a tile, we want to remove it
        if (tile.model.hasDecision(decision)) {
          tileChanges = { ...tileChanges, ...tile.removeDecision(decision) };
        } else {
          tileChanges = { ...tileChanges, ...tile.addDecision(decision) };
          emittedSubjects.push(tile.model);
        }
      }

      decisionMap.set(tile.model, { change: tileChanges, oldSubject });
    }

    // We only dispatch the "decisionMade" event after the decision has been
    // applied to the dataset.
    // This is important for third party event listeners who may want to see the
    // entire decision set after a decision is made.
    this.dispatchEvent(
      new CustomEvent<DecisionMadeEvent>(VerificationGridComponent.decisionMadeEventName, {
        detail: decisionMap,
      }),
    );

    // Because auto-paging and automatic tile selection are dependent upon the
    // "no decision required" states, it must be performed first.
    this.updateDecisionWhen();

    if (this.shouldAutoPage()) {
      // we wait for 300ms so that the user has time to see the decision that
      // they have made in the form of a decision highlight around the selected
      // grid tiles and the chosen decision button
      await sleep(VerificationGridComponent.autoPageTimeout);
      this.pageNext(gridTiles.length);

      // If the last tile that was selected was auto-selected, we should
      // continue auto-selection onto the next page.
      if (this.singleDecisionMode) {
        this.selectFirstTile();
      }

      return;
    }

    // If there is only one tile selected, and all of the tiles tasks are
    // completed, we want to automatically advance the selection head.
    if (hasSubSelection && subSelection.length === 1 && !this.hasClassificationTask()) {
      const selectedTile = subSelection[0];

      // We always set singleDecisionMode after a tile is automatically selected
      // due to auto-advancement because the selection handler method disables
      // the singleDecisionMode.
      // This method upsets the single decision mode because all selection apart
      // from this single caller is the result of explicit user selection that
      // takes the user out of the automatic advancement "single decision mode".
      //
      // We need to set singleDecisionMode so that when we autoPage the first
      // tile on the following page will be automatically selected.
      if (selectedTile.taskCompleted) {
        this.moveSelectionHeadToNextUndecided(selectedTile.index);
        this.singleDecisionMode = true;
      }
    }
  }

  private shouldAutoPage(): boolean {
    const allTileTaskCompleted = Array.from(this.gridTiles).every((tile) => tile.taskCompleted);

    // I have disabled auto paging when viewing history so that the user can see
    // the colors change when they change an applied decision
    return !this.isViewingHistory() && allTileTaskCompleted;
  }

  private setDecisionDisabled(disabled: boolean): void {
    const decisionElements = this.decisionElements ?? [];
    for (const decisionElement of decisionElements) {
      decisionElement.disabled = disabled;
    }
  }

  private updateDecisionWhen(subSelection = this.currentSubSelection): void {
    // If any of the decision buttons predicate's pass with the current
    // sub-selection, the button should not be disabled.
    const decisionElements = this.decisionElements ?? [];
    for (const decisionElement of decisionElements) {
      decisionElement.disabled = !subSelection.some((subject) => decisionElement.when(subject));
    }

    // Each tiles required decisions are determined from the decision buttons
    // "when" predicates.
    // Therefore, when we update the decision buttons disabled state, we also
    // need to update the required decisions.
    const gridTiles = Array.from(this.gridTiles);
    for (const tile of gridTiles) {
      this.updateDecisionWhenForSubject(tile);
    }
  }

  private updateDecisionWhenForSubject(tile: VerificationGridTileComponent): void {
    const subject = tile.model;
    const decisionElements = this.decisionElements ?? [];

    const oldSubject = Object.assign({}, subject);
    let change: SubjectChange = {};

    // Each subject has required decisions that must be completed.
    // Required decisions are determined from the decision buttons "when"
    // predicates.
    // If the predicate doesn't pass for the current decision button, we mark
    // the task as "not required" in the subject.
    for (const decisionElement of decisionElements) {
      const passes = decisionElement.when(subject);
      if (passes) {
        subject.setDecisionRequired(decisionElement.decisionConstructor);
      } else {
        change = { ...change, ...subject.setDecisionNotRequired(decisionElement.decisionConstructor) };
      }
    }

    tile.updateSubject(subject);

    if (Object.keys(change).length > 0) {
      // We only dispatch the "decisionWhenUpdated" event after updateSubject so
      // the risk reading of a race condition is minimized.
      this.dispatchEvent(
        new CustomEvent<DecisionMadeEvent>(VerificationGridComponent.decisionMadeEventName, {
          detail: new Map([[subject, { change, oldSubject }]]),
        }),
      );
    }
  }

  //#endregion

  //#region Rendering

  private hasDecisionElements(): boolean {
    return Array.from(this.decisionElements ?? []).length > 0;
  }

  private areTilesLoaded(): boolean {
    const gridTilesArray = Array.from(this.gridTiles);
    return !gridTilesArray.some((tile: VerificationGridTileComponent) => !tile.loaded);
  }

  private handleTileLoaded(event: CustomEvent): void {
    if (!(event.target instanceof VerificationGridTileComponent)) {
      console.error(`caught ${VerificationGridTileComponent.loadedEventName} event from non-grid tile element`);
      return;
    }

    // This method is run when a tile has completely finished loading.
    // Therefore, if this loaded event was emitted from the last tile needed to
    // have a fully loaded verification grid, we want to perform some actions
    // such as enabling the decision buttons and emitting the verification
    // grid's "grid-loaded" event.
    if (this.areTilesLoaded()) {
      this.loadState = LoadState.LOADED;
      this.dispatchEvent(new CustomEvent(VerificationGridComponent.loadedEventName));
      this.updateDecisionWhen();
    }
  }

  //#endregion

  //#region Prompts

  private hasClassificationTask(): boolean {
    return this.classificationDecisionElements.length > 0;
  }

  private hasVerificationTask(): boolean {
    // Some verification components (skip) are supportive to the current task,
    // and do not create their own verification task.
    return this.verificationDecisionElements.some((element) => element.isTask);
  }

  private hasNewTagTask(): boolean {
    return this.tagPromptDecisionElements.length > 0;
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
      return "Does the shown audio segment have the correct applied tag";
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

  private noItemsTemplate(): HTMLTemplateResult {
    return html`
      <div class="message-overlay">
        <p>
          <strong>No un-validated results found</strong>
        </p>
        <p>All ${this.decisionHead} annotations are validated</p>
      </div>
    `;
  }

  private loadingTemplate(): HTMLTemplateResult {
    return html`
      <div class="message-overlay">
        <span class="loading-message">Loading</span>
        <div>${loadingSpinnerTemplate()}</div>
      </div>
    `;
  }

  private datasetFailureTemplate(): HTMLTemplateResult {
    return html`
      <div class="message-overlay">
        <p>
          <strong>Failed to load dataset.</strong>
        </p>
      </div>
    `;
  }

  private tileGridTemplate(): HTMLTemplateResult {
    if (this.currentPageIndices.start >= this.currentPageIndices.end) {
      return this.noItemsTemplate();
    }

    return html`
      ${repeat(this.currentPage(), (subject: SubjectWrapper | null, index: number) =>
        this.gridTileTemplate(subject, index),
      )}
    `;
  }

  private noDecisionsTemplate(): HTMLTemplateResult {
    return html`<strong class="no-decisions-warning">No decisions available.</strong>`;
  }

  private skipDecisionTemplate(): HTMLTemplateResult {
    return html`<oe-skip shortcut="s"></oe-skip>`;
  }

  private progressBarTemplate(): HTMLTemplateResult {
    return html`
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
    `;
  }

  private emptySubjectTemplate(): HTMLTemplateResult {
    return html`<div class="grid-tile tile-placeholder">${this.emptySubjectText}</div>`;
  }

  private gridTileTemplate(subject: SubjectWrapper | null, index: number): HTMLTemplateResult {
    const tileTemplate = html`
      <oe-verification-grid-tile
        class="grid-tile"
        @oe-tile-loaded="${this.handleTileLoaded}"
        @play="${this.handleTilePlay}"
        .requiredDecisions="${this.requiredDecisions}"
        .isOnlyTile="${this.populatedTileCount === 1}"
        .model="${subject as any}"
        .index="${index}"
      >
        ${this.gridItemTemplate ? templateContent(this.gridItemTemplate) : nothing}
      </oe-verification-grid-tile>
    `;

    // By using "cache" here Lit will cache the tile template meaning that it
    // doesn't need to be re-created when tiles are added or removed from the
    // grid.
    return html`${cache(subject === null ? this.emptySubjectTemplate() : tileTemplate)}`;
  }

  public render() {
    return html`
      <oe-verification-bootstrap
        @open="${this.handleBootstrapDialogOpen}"
        @close="${this.handleBootstrapDialogClose}"
        .hasVerificationTask="${this.hasVerificationTask()}"
        .hasClassificationTask="${this.hasClassificationTask()}"
        .decisionElements="${this.decisionElements ?? []}"
        .isMobile="${this.isMobileDevice()}"
      ></oe-verification-bootstrap>
      <div id="highlight-box"></div>

      <div class="verification-container">
        <div class="controls-container header-controls">
          ${when(this.progressBarPosition === ProgressBarPosition.TOP, () => this.progressBarTemplate())}
        </div>

        <div
          id="grid-container"
          class="verification-grid"
          style="--columns: ${this.columns}; --rows: ${this.rows};"
          @overlap="${this.handleTileOverlap}"
          tabindex="-1"
        >
          ${choose(this.loadState, [
            [LoadState.LOADING, () => this.loadingTemplate()],
            [LoadState.FETCHED, () => this.tileGridTemplate()],
            [LoadState.LOADED, () => this.tileGridTemplate()],
            [LoadState.ERROR, () => this.datasetFailureTemplate()],
          ])}
        </div>

        <div class="footer-container">
          <div class="controls-container">
            <span id="element-container" class="decision-controls-left">
              <oe-verification-grid-settings></oe-verification-grid-settings>

              <button
                data-testid="help-dialog-button"
                @click="${() => this.handleHelpRequest()}"
                class="oe-btn-info"
                rel="help"
              >
                <sl-icon name="question-circle" class="large-icon"></sl-icon>
              </button>

              ${when(
                this.isViewingHistory(),
                () => html`
                  <button
                    data-testid="continue-verifying-button"
                    class="oe-btn-secondary"
                    @click="${this.resumeVerification}"
                  >
                    Continue ${this.hasVerificationTask() ? "Verifying" : "Classifying"}
                  </button>
                `,
              )}
            </span>

            <span class="decision-controls">
              <h2 class="verification-controls-title">
                ${this.hasDecisionElements() ? this.decisionPromptTemplate() : this.noDecisionsTemplate()}
              </h2>
              <div id="decisions-container" class="decision-control-actions">
                <slot id="decision-slot" @slotchange="${() => this.handleSlotChange()}"></slot>
              </div>
            </span>

            <span class="decision-controls-right">
              <slot name="data-source"></slot>
            </span>
          </div>

          ${when(this.progressBarPosition === ProgressBarPosition.BOTTOM, () => this.progressBarTemplate())}
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
