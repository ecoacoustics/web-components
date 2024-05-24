import { customElement, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement } from "lit";
import { Spectrogram } from "../../../playwright";
import { queryDeeplyAssignedElements } from "../../helpers/decorators";
import { classMap } from "lit/directives/class-map.js";
import { verificationGridTileStyles } from "./css/style";
import { Verification } from "../../models/verification";

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
  public static styles = verificationGridTileStyles;

  @state()
  public model: Verification | undefined;

  @state()
  public selected = false;

  @state()
  public index = 0;

  @queryDeeplyAssignedElements({ selector: "oe-spectrogram" })
  private spectrogram: Spectrogram | undefined;

  protected willUpdate(): void {
    if (this.spectrogram && this.model?.url) {
      this.spectrogram.src = this.model.url;
    }
  }

  private handleClick() {
    this.selected = !this.selected;
  }

  public render() {
    return html`
      <div class="tile-container ${classMap({ selected: this.selected })}">
        <slot @click="${this.handleClick}"></slot>
      </div>
    `;
  }
}
