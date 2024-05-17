import { customElement } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement } from "lit";
import { verificationGridStyles } from "./css/style";

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
 * @property getPage - A callback function that returns a page from a page number
 *
 * @slot - A template to display the audio event to be verified
 */
@customElement("oe-verification-grid")
export class VerificationGrid extends AbstractComponent(LitElement) {
  public static styles = verificationGridStyles;

  public render() {
    return html`
      <div class="grid-element">
        <slot></slot>
      </div>
    `;
  }
}
