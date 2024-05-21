import { customElement, property, queryAll, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, PropertyValueMap } from "lit";
import { verificationGridStyles } from "./css/style";
import { Spectrogram } from "../spectrogram/spectrogram";
import { queryDeeplyAssignedElements } from "../../helpers/decorators";

type PageFetcher = (pageNumber: number) => Promise<any[]>;

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
  private pagedItems = 0;

  @property({ type: String })
  public src: string | undefined;

  @property({ type: String })
  public key!: string;

  @property({ attribute: "get-page", type: String })
  public getPage!: PageFetcher;

  @queryDeeplyAssignedElements({ selector: "template" })
  public spectrogramTemplate!: HTMLTemplateElement;

  @queryAll("oe-spectrogram")
  public spectrograms: Spectrogram[] | undefined;

  @queryAll(".sub-selection-checkbox")
  public subSelectionCheckboxes: HTMLInputElement[] | undefined;

  @state()
  private spectrogramElements: any;

  private totalItems = 0;
  private subSelection: Set<any> = new Set([]);

  protected willUpdate(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    const invalidationKeys: (keyof this)[] = ["gridSize", "src", "getPage", "key"];

    if (invalidationKeys.some((key) => changedProperties.has(key))) {
      if (!this.getPage) {
        if (!this.src) {
          throw new Error("Neither getPage or src is defined on oe-verification-grid element");
        }

        this.getPage = this.computedCallback(this.src);
      }

      this.gridSize = this.calculateGridSize(this.gridSize);
      this.renderSpectrograms();
    }
  }

  private calculateGridSize(target: number): number {
    // TODO: We might want to use the window size here
    return target;
  }

  private catchDecision(event: CustomEvent) {
    const decision = event.detail.value;
    const selectedItems = this.subSelection.size > 0 ? Array.from(this.subSelection) : "all items";

    console.log(`you selected:\n${decision} for:\n${selectedItems}`);

    this.pagedItems += this.gridSize;
    this.removeSubSelection();

    this.virtualPage();
  }

  private computedCallback(src: string): PageFetcher {
    return async () => {
      const response = await fetch(src);
      const data = await response.json();
      this.totalItems = data.length;

      const startIndex = this.pagedItems;
      const endIndex = startIndex + this.gridSize;

      return data.slice(startIndex, endIndex);
    };
  }

  private selectSubSelection(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    if (target.checked) {
      this.subSelection.add(value);
    } else {
      this.subSelection.delete(value);
    }
  }

  private removeSubSelection(): void {
    this.subSelection = new Set([]);
    this.subSelectionCheckboxes?.forEach((element) => {
      element.checked = false;
    });
  }

  private async virtualPage(): Promise<void> {
    this.removeSubSelection();

    const elements = this.spectrograms;

    if (!elements?.length) {
      throw new Error("Could not find instantiated spectrogram elements");
    }

    const nextPage = await this.getPage(this.pagedItems);

    if (nextPage.length === 0) {
      this.spectrogramElements = this.noItemsTemplate();
    }

    nextPage.forEach((url: any, i: number) => {
      const target = elements[i];
      const source = url[this.key];
      target.src = source;
    });

    // if we are on the last page, we should hide some elements
    const pagedDelta = elements.length - nextPage.length;

    if (pagedDelta > 0) {
      // TODO: do something here
    }
  }

  // we have to use the template provided in the slot
  // an change the src of all oe-spectrogram elements to the src attribute
  // then we return the instantiated templates as a Lit HTML template
  private async renderSpectrograms() {
    const page = await this.getPage(this.pagedItems);

    if (!page.length) {
      this.spectrogramElements = this.noItemsTemplate();
    }

    this.spectrogramElements = page.map((source) => {
      const derivedSource = source[this.key];
      const template = this.spectrogramTemplate.content.cloneNode(true) as HTMLElement;
      const spectrogram = template.querySelector<Spectrogram>("oe-spectrogram")!;

      if (spectrogram && derivedSource) {
        spectrogram.src = derivedSource;
      }

      return this.spectrogramElement(spectrogram);
    });
  }

  private spectrogramElement(spectrogram: Spectrogram) {
    return html`
      <div>
        <input
          @change="${this.selectSubSelection}"
          type="checkbox"
          class="sub-selection-checkbox"
          value="${spectrogram.src}"
          part="sub-selection-checkbox"
        />
        ${spectrogram}
      </div>
    `;
  }

  private noItemsTemplate() {
    return html`
      <div class="no-items-message">
        <p>
          <strong>No un-validated results found</strong>
        </p>
        <p>All ${this.totalItems} annotations are validated</p>
      </div>
    `;
  }

  public render() {
    return html`
      <div class="grid">${this.spectrogramElements}</div>
      <slot @decision="${this.catchDecision}"></slot>
    `;
  }
}
