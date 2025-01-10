import { html, LitElement, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import annotateStyles from "./css/style.css?inline";

@customElement("oe-annotate")
export class AnnotateComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(annotateStyles);

  private handleSlotChange(): void {}

  public render() {
    return html`
      <div class="vertically-fill">
        <slot @slotchange="${() => this.handleSlotChange()}"></slot>
      </div>
    `;
  }
}
