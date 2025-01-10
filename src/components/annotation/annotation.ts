import { html, LitElement, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import annotationStyles from "./css/style.css?inline";

@customElement("oe-annotation")
export class AnnotationComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(annotationStyles);

  public render() {
    return html`
      <aside id="annotation-container">
        <h2 class="bounding-box-label">Tag Name</h2>
        <div class="bounding-box"></div>
      </aside>
    `;
  }
}
