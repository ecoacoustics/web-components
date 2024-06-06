import { customElement, property, query, queryAll, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, PropertyValueMap, TemplateResult } from "lit";
import { verificationGridStyles } from "./css/style";
import { Spectrogram } from "../spectrogram/spectrogram";
import { queryAllDeeplyAssignedElements, queryDeeplyAssignedElement } from "../../helpers/decorators";
import { Verification } from "../../models/verification";
import { VerificationGridTile } from "../verification-grid-tile/verification-grid-tile";
import { Decision } from "../decision/decision";
import { Parser } from "@json2csv/plainjs";
import { VerificationParser } from "../../services/verificationParser";

export type SelectionObserverType = "desktop" | "tablet";
export type PageFetcher = (elapsedItems: number) => Promise<any[]>;
type SelectionEvent = CustomEvent<{ shiftKey: boolean; ctrlKey: boolean; index: number }>;
type DecisionEvent = CustomEvent<{ value: boolean; tag: string; additionalTags: string[] }>;

interface KeyboardShortcut {
  key: string;
  description: string;
}

const helpPreferenceLocalStorageKey = "oe-verification-grid-dialog-preferences";

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
 * @property get-page - A callback function that returns a page from a page number
 * @property grid-size - The number of items to display in a single grid
 * @property key - An object key to use as the audio source
 * @property selection-behavior {desktop | tablet}
 *
 * @csspart sub-selection-checkbox - A css target for the sub-selection checkbox
 *
 * @slot - A template to display the audio event to be verified
 */
//! Please don't look at this component yet until it is finalized, it has a lot of bad code
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
  public selectionBehavior: SelectionObserverType = "desktop";

  @property({ type: String })
  public audioKey!: string;

  @property({ attribute: "get-page", type: String })
  public getPage!: PageFetcher;

  @queryDeeplyAssignedElement({ selector: "template" })
  public gridItemTemplate!: HTMLTemplateElement;

  @queryAllDeeplyAssignedElements({ selector: "oe-decision" })
  public decisionElements!: Decision[];

  @queryAll("oe-verification-grid-tile")
  public gridTiles!: NodeListOf<VerificationGridTile>;

  @query("#help-dialog")
  private helpDialogElement!: HTMLDialogElement;

  @state()
  private spectrogramElements: TemplateResult<1> | TemplateResult<1>[] | undefined;

  @state()
  public loading = false;

  public decisions: Verification[] = [];
  private spectrogramsLoaded = 0;
  private hiddenTiles = 0;
  private fileType: "json" | "csv" = "json";

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
  private dragStartPos = { x: 0, y: 0 };

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
    const shouldShowHelpDialog = localStorage.getItem(helpPreferenceLocalStorageKey) === null;

    if (shouldShowHelpDialog) {
      this.helpDialogElement.showModal();
    }
  }

  protected updated(change: PropertyValueMap<this>): void {
    const reRenderKeys: (keyof this)[] = ["gridSize", "audioKey"];
    const elementsToObserve = this.gridTiles;

    const sourceInvalidationKeys: (keyof this)[] = ["getPage"];

    if (change.has("selectionBehavior")) {
      this.multiSelectHead = null;

      this.decisionElements.forEach((element: Decision) => {
        element.selectionMode = this.selectionBehavior;
      });
    }

    // TODO: figure out if there is a better way to do this invalidation
    if (sourceInvalidationKeys.some((key) => change.has(key))) {
      this.pagedItems = 0;

      if (this.gridTiles?.length) {
        this.renderVirtualPage();
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
  }

  private handleKeyDown(event: KeyboardEvent): void {
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
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    event.preventDefault();

    if (!event.altKey) {
      this.hideSelectionShortcuts();
    }
  }

  private handleWindowBlur(): void {
    this.hideSelectionShortcuts();
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
        // this.hideGridItems(this.hiddenTiles + 1);
      }
    }
  }

  // we could improve the performance here by creating a "selectionHandler" component property
  // which is set to handleDesktopSelection.bind(this) or handleTabletSelection.bind(this)
  // when the selection-behavior attribute is updated
  // (meaning that we don't have to evaluate the switch statement every selection event)
  // however, I deemed that it hurt readability and the perf hit is negligible
  private selectionHandler(selectionEvent: SelectionEvent): void {
    switch (this.selectionBehavior) {
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

  private catchDecision(event: DecisionEvent) {
    const decision: boolean = event.detail.value;
    const tags: any[] =
      event.detail.tag === "*"
        ? this.decisionElements.map((model: Decision) => model.tag).filter((tag: any) => tag !== "*")
        : [event.detail.tag];
    const additionalTags: any[] = event.detail.additionalTags;

    const gridTiles = Array.from(this.gridTiles);
    const subSelection = gridTiles.filter((tile) => tile.selected);
    const hasSubSelection = subSelection.length > 0;

    const selectedItems = hasSubSelection ? subSelection : gridTiles;
    const selectedTiles = selectedItems.map((tile) => tile.model);
    const value: Verification[] = [];

    for (const tag of tags) {
      for (const tile of selectedTiles) {
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

    this.decisions.push(...value);
    this.dispatchEvent(new CustomEvent("decision-made", { detail: value }));

    this.removeSubSelection();

    this.pagedItems += this.gridSize;
    this.renderVirtualPage();
  }

  private async renderVirtualPage(): Promise<void> {
    const elements = this.gridTiles;

    //? HN asking AT: `!elements?.length` or `elements === undefined || elements.length === 0`
    if (elements === undefined || elements.length === 0) {
      throw new Error("Could not find instantiated spectrogram elements");
    }

    let nextPage = await this.getPage(this.pagedItems);

    if (nextPage.length === 0) {
      this.spectrogramElements = this.noItemsTemplate();
    }

    nextPage = nextPage.map(VerificationParser.parse);

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
      this.hiddenTiles = 0;
    }

    this.cacheNext();
  }

  private hideGridItems(numberOfTiles: number): void {
    // TODO: improve this
    const elementsToHide = Array.from(this.gridTiles).slice(-numberOfTiles);

    elementsToHide.forEach((element) => {
      element.style.display = "none";
    });

    this.hiddenTiles = numberOfTiles;
  }

  private async cacheClient(elapsedItems: number) {
    let page = await this.getPage(elapsedItems);

    if (page.length === 0) {
      return;
    }

    page = page.map(VerificationParser.parse);

    await Promise.all(page.map((item) => fetch(item.url, { method: "GET" })));
  }

  private async cacheServer(targetElapsedItems: number) {
    while (this.serverCacheHead < targetElapsedItems) {
      let page = await this.getPage(this.serverCacheHead);

      if (page.length === 0) {
        this.serverCacheExhausted = true;
        return;
      }

      page = page.map(VerificationParser.parse);

      Promise.all(page.map((item) => fetch(item.url, { method: "HEAD" })));

      this.serverCacheHead += page.length;
    }
  }

  private cacheNext() {
    // start caching client side from the start of the next page
    const pagesToClientCache = this.pagedItems + this.gridSize;

    const PagesToCacheServerSide = 10;
    // prettier-ignore
    const targetServerCacheHead = pagesToClientCache + (this.gridSize * PagesToCacheServerSide);

    this.cacheClient(pagesToClientCache);
    if (!this.serverCacheExhausted) {
      this.cacheServer(targetServerCacheHead);
    }
  }

  private handleSpectrogramLoaded(): void {
    this.spectrogramsLoaded++;

    if (this.spectrogramsLoaded >= this.gridSize - this.hiddenTiles) {
      this.loading = false;
      this.spectrogramsLoaded = 0;

      this.decisionElements.forEach((element) => {
        element.disabled = false;
      });
    } else {
      this.loading = true;
    }
  }

  private handleLoading(): void {
    if (!this.loading) {
      this.spectrogramsLoaded = 0;

      console.log("loading");
      this.decisionElements.forEach((element) => {
        element.disabled = true;
      });
    }

    this.loading = true;
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
      const spectrogram = template.querySelector<Spectrogram>("oe-spectrogram");

      if (spectrogram) {
        spectrogram.addEventListener("loading", () => this.handleLoading());
        spectrogram.addEventListener("loaded", () => this.handleSpectrogramLoaded());
      }

      verificationGridBuffer.push(html`<oe-verification-grid-tile>${template}</oe-verification-grid-tile>`);
    }

    this.spectrogramElements = verificationGridBuffer;
  }

  private highlightIntersectionHandler(entries: IntersectionObserverEntry[]) {
    console.log("intersecting", entries);
  }

  private doneRenderBoxInit = false;
  private renderHighlightBox(event: PointerEvent) {
    if (event.isPrimary) {
      this.highlighting = true;

      const element = this.shadowRoot!.getElementById("highlight-box");
      if (!element) {
        return;
      }

      if (!this.doneRenderBoxInit) {
        const intersectionObserver = new IntersectionObserver((event) => this.highlightIntersectionHandler(event));
        intersectionObserver.observe(element);
        this.doneRenderBoxInit = true;
      }

      element.style.display = "block";
      element.style.left = `${event.clientX}px`;
      element.style.top = `${event.clientY}px`;

      this.dragStartPos = { x: event.clientX, y: event.clientY };
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

    const { clientX, clientY } = event;

    const highlightWidth = clientX - this.dragStartPos.x;
    const highlightHeight = clientY - this.dragStartPos.y;

    element.style.width = `${Math.abs(highlightWidth)}px`;
    element.style.height = `${Math.abs(highlightHeight)}px`;

    if (highlightWidth < 0) {
      element.style.left = `${clientX}px`;
    }

    if (highlightHeight < 0) {
      element.style.top = `${clientY}px`;
    }
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

  // TODO: clean up this function
  // TODO: there is a "null" in additional tags (if none)
  private downloadResults(): void {
    let formattedResults = "";
    const fileFormat = this.fileType;
    const results = this.decisions.map((decision: Verification) => {
      const subject = decision.subject;
      const tag = decision.tag?.text;
      const confirmed = decision.confirmed;
      const additionalTags = decision.additionalTags?.map((tag) => tag.text);

      return { ...subject, tag, confirmed, additionalTags };
    });

    if (fileFormat === "json") {
      formattedResults = JSON.stringify(results);
    } else if (fileFormat === "csv") {
      formattedResults = new Parser().parse(results);
    }

    const blob = new Blob([formattedResults], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    // TODO: we should just be able to use the file download API
    // TODO: probably apply a transformation to arrays in CSVs (use semi-columns as item delimiters)
    const a = document.createElement("a");
    a.href = url;
    a.download = "verification-results";
    a.click();
    URL.revokeObjectURL(url);
  }

  // TODO: narrow the typing here
  private closeHelpDialog(): void {
    const dialogPreference = this.shadowRoot!.getElementById("dialog-preference") as HTMLInputElement;
    const shouldShowDialog = !dialogPreference.checked;

    if (!shouldShowDialog) {
      localStorage.setItem(helpPreferenceLocalStorageKey, "true");
    } else {
      localStorage.removeItem(helpPreferenceLocalStorageKey);
    }
  }

  private highlightBoxTemplate(): TemplateResult<1> {
    return html`<div
      id="highlight-box"
      @mouseup="${this.hideHighlightBox}"
      @mousemove="${this.resizeHighlightBox}"
    ></div>`;
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

  private keyboardShortcutTemplate(shortcuts: KeyboardShortcut[]): TemplateResult<1> {
    return html`
      <div class="keyboard-shortcuts">
        ${shortcuts.map(
          (shortcut) => html`<div class="row">
            <kbd class="key">${shortcut.key}</kbd>
            <span class="description">${shortcut.description}</span>
          </div>`,
        )}
      </div>
    `;
  }

  private helpDialogTemplate(): TemplateResult<1> {
    const selectionKeyboardShortcuts: KeyboardShortcut[] = [
      { key: "Ctrl + A", description: "Select all items" },
      { key: "Ctrl + Shift + A", description: "Select all items" },
      { key: "Shift + Click", description: "Select a range of items" },
      { key: "Ctrl + Click", description: "Toggle the selection of a single item" },
      { key: "Ctrl + Shift + Click", description: "Select a range of items" },
      { key: "Escape", description: "Deselect all items" },
    ];

    // decision shortcuts are fetched from the decision elements
    // TODO: fix this
    const decisionShortcuts: KeyboardShortcut[] = [
      ...(this.decisionElements?.map((element) => {
        return { key: element.shortcut, description: element.innerText };
      }) ?? []),
    ] as any;

    // TODO: there are some hacks in here to handle closing the modal when the user clicks off
    return html`
      <dialog id="help-dialog" @click="${() => this.helpDialogElement.close()}" @close="${this.closeHelpDialog}">
        <div class="dialog-container" @click="${(event: PointerEvent) => event.stopPropagation()}">
          <h1>Information</h1>

          <section>
            <h2>Overview</h2>
            <p>
              The Verification grid is a tool to help you validate and verify audio events either generated by a machine
              learning model or by a human annotator.
            </p>
          </section>

          <section>
            <h2>Decisions</h2>

            <h3>Keyboard Shortcuts</h3>
            ${this.keyboardShortcutTemplate(decisionShortcuts)}
          </section>

          <section>
            <h2>Sub-Selection</h2>
            <p>
              You can apply a decision to only a few items in the grid by clicking on them, or using one of the keyboard
              shortcuts below.
            </p>

            <p>
              You can also use <kbd>Alt + number</kbd> to select a tile using you keyboard. It is possible to see the
              possible keyboard shortcuts for selection by holding down the <kbd>Alt</kbd> key.
            </p>

            <h3>Keyboard Shortcuts</h3>
            ${this.keyboardShortcutTemplate(selectionKeyboardShortcuts)}
          </section>

          <hr />

          <form class="dialog-controls" method="dialog">
            <label class="show-again">
              <input
                id="dialog-preference"
                name="dialog-preference"
                type="checkbox"
                ?checked="${localStorage.getItem(helpPreferenceLocalStorageKey) !== null}"
              />
              Do not show this dialog again
            </label>
            <button class="oe-btn oe-btn-primary close-btn" type="submit" autofocus>Close</button>
          </form>
        </div>
      </dialog>
    `;
  }

  public render() {
    return html`
      ${this.helpDialogTemplate()}

      <div class="verification-container">
        <button @click="${this.downloadResults}" class="oe-btn oe-btn-secondary">Download Results</button>
        <button @click="${() => this.helpDialogElement.showModal()}" class="oe-btn oe-btn-secondary">Help</button>

        <div
          @selected="${this.selectionHandler}"
          @pointerdown="${this.renderHighlightBox}"
          @pointerup="${this.hideHighlightBox}"
          @pointermove="${this.resizeHighlightBox}"
          class="verification-grid"
        >
          ${this.spectrogramElements}
        </div>
        <h2 class="verification-controls-title">Are all of these a</h2>
        <div class="verification-controls">
          <slot @decision="${this.catchDecision}"></slot>
        </div>

        <div class="paging-options">
          <button class="oe-btn oe-btn-secondary">Previous</button>
        </div>
      </div>
      ${this.highlightBoxTemplate()}
    `;
  }
}
