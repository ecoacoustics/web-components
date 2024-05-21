import { customElement, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement } from "lit";
import { Spectrogram } from "../../../playwright";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { classMap } from "lit/directives/class-map.js";
import { verificationGridTileStyles } from "./css/style";
import { Verification } from "../../models/verification";
import { theming } from "../../helpers/themes/theming";

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
  public static styles = [verificationGridTileStyles, theming];

  @state()
  public model!: Verification;

  @state()
  public selected = false;

  @state()
  public index = 0;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram: Spectrogram | undefined;

  protected willUpdate(): void {
    if (this.spectrogram && this.model?.url) {
      this.spectrogram.src = this.model.url;
    }
  }

  private handleClick(event: MouseEvent | TouchEvent) {
    // TODO: passing through client events should be handled by the oe-media-controls component
    const ignoreTargets = ["oe-media-controls", "button"];
    // TODO: remove type override
    const targetTag = (event.target as HTMLElement).tagName;

    if (ignoreTargets.includes(targetTag.toLocaleLowerCase())) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent("selected", {
        bubbles: true,
        detail: {
          index: this.index,
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
        },
      }),
    );
  }

  public render() {
    return html`
      <div @click="${this.handleClick}" class="tile-container ${classMap({ selected: this.selected })}">
        <slot></slot>
      </div>
    `;
  }
}
