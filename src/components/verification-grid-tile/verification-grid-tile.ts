import { customElement, state } from "lit/decorators.js";
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
 * @property order - Used for shift selection
 *
 * @slot
 */
@customElement("oe-verification-grid-tile")
export class VerificationGridTile extends AbstractComponent(LitElement) {
  @state()
  public src: string | undefined;

  @state()
  public selected = false;

  @state()
  public order = 0;

  @queryDeeplyAssignedElements({ selector: "oe-spectrogram" })
  private spectrogram: Spectrogram | undefined;

  protected willUpdate(): void {
    if (this.spectrogram && this.src) {
      this.spectrogram.src = this.src;
    }
  }

  protected handleClick() {
    this.selected = !this.selected;
  }

  public render() {
    return html`<slot @click="${this.handleClick}"></slot>`;
  }
}
