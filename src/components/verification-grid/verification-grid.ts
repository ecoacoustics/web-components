import { customElement, property, queryAssignedElements, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement } from "lit";
import { verificationGridStyles } from "./css/style";
import { Spectrogram } from "../spectrogram/spectrogram";

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
 * @slot - A template to display the audio event to be verified
 */
@customElement("oe-verification-grid")
export class VerificationGrid extends AbstractComponent(LitElement) {
  public static styles = verificationGridStyles;

  @property({ attribute: "get-page", type: String, reflect: false })
  public getPage!: PageFetcher;

  @property({ attribute: "grid-size", type: Number, reflect: true })
  public gridSize = 10;

  @property({ type: String, reflect: true })
  public src: string | undefined;

  @property({ type: String, reflect: true })
  public key!: string;

  @queryAssignedElements()
  public slotElements!: HTMLTemplateElement[];

  @state()
  private page: any[] = [];

  @state()
  private pageNumber = 0;
  private totalItems = 0;

  protected firstUpdated(): void {
    if (this.src && !this.getPage) {
      this.getPage = this.computedCallback(this.src);
    }

    this.updateResults();
  }

  private async updateResults(): Promise<void> {
    this.page = await this.getPage(this.pageNumber);
  }

  private catchDecision(event: CustomEvent) {
    console.log(event);

    this.pageNumber++;
    this.updateResults();
  }

  private computedCallback(src: string): PageFetcher {
    return async (pageNumber: number) => {
      const response = await fetch(src);
      const data = await response.json();

      const startIndex = pageNumber * this.gridSize;
      const endIndex = startIndex + this.gridSize;

      this.totalItems = data.length;

      return data.slice(startIndex, endIndex);
    };
  }

  // we have to use the template provided in the slot
  // an change the src of all oe-spectrogram elements to the src attribute
  // then we return the instantiated templates as a Lit HTML template
  private renderSpectrograms() {
    if (!this.page.length) {
      return this.noItemsTemplate();
    }

    const spectrogramTemplate = this.slotElements[0];

    return this.page.map((source) => {
      const derivedSource = source[this.key];
      const template = spectrogramTemplate.content.cloneNode(true) as HTMLElement;
      const spectrogram = template.querySelector<Spectrogram>("oe-spectrogram");

      if (spectrogram && derivedSource) {
        spectrogram.src = derivedSource;
      }

      return html`${template}`;
    });
  }

  private noItemsTemplate() {
    return html`
      <span class="no-items-message">
        <div>
          <p>
            <strong>No un-validated results found</strong>
          </p>
          <p>All ${this.totalItems} annotations are validated</p>
        </div>
      </span>
    `;
  }

  public render() {
    const instantiatedSpectrograms = this.renderSpectrograms();

    return html`
      <div>
        <div class="grid">${instantiatedSpectrograms}</div>
      </div>

      <div class="slot-elements">
        <slot @decision="${this.catchDecision}"></slot>
      </div>
    `;
  }
}
