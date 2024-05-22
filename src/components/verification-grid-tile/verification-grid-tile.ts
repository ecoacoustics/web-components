import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement } from "lit";
import { Spectrogram } from "../../../playwright";
import { queryDeeplyAssignedElements } from "../../helpers/decorators";

/**
 * A component to scope ids to a template inside a shadow DOM
 * This component will be used by the verification-grid component but will
 * probably not be used by users
 * It can also manage the selection state
 *
 * @property src - The source of the spectrogram
 * @property selected - If the item is selected as part of a sub-selection
 *
 * @slot
 */
@customElement("oe-verification-grid-tile")
export class VerificationGridTile extends AbstractComponent(LitElement) {
  @property({ type: String, reflect: true })
  public src: string | undefined;

  @property({ type: Boolean, reflect: true })
  public selected: boolean | undefined;

  @queryDeeplyAssignedElements({ selector: "oe-spectrogram" })
  private spectrogram: Spectrogram | undefined;

  protected willUpdate(): void {
          console.log("updating", this.spectrogram, "with", this.src);
    if (this.spectrogram && this.src) {
      this.spectrogram.src = this.src;
    }
  }

  protected handleClick() {
    console.log("clicked");
  }

  public render() {
    return html`<slot @click="${this.handleClick}"></slot>`;
  }
}
