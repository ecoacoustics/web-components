import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { required } from "../../helpers/decorators";
import { Annotation } from "../../models/annotation";
import { Tag } from "../../models/tag";
import annotationStyles from "./css/style.css?inline";

@customElement("oe-annotation")
export class AnnotationComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(annotationStyles);

  @required()
  @property({ attribute: "low-frequency", type: Number })
  public lowFrequency!: number;

  @required()
  @property({ attribute: "high-frequency", type: Number })
  public highFrequency!: number;

  @required()
  @property({ attribute: "start-time", type: Number })
  public startTime!: number;

  @required()
  @property({ attribute: "end-time", type: Number })
  public endTime!: number;

  @property({ type: Array })
  public tags: string[] = [];

  public get tagModels(): Tag[] {
    return [];
  }

  public get model(): Readonly<Annotation> {
    return new Annotation(
      this.startTime,
      this.endTime,
      this.lowFrequency,
      this.highFrequency,
      this.tagModels,
      this,
      [],
    );
  }

  public render() {
    return html`
      <aside id="annotation-container">
        <h2 class="bounding-box-label">Tag Name</h2>
        <div class="bounding-box"></div>
      </aside>
    `;
  }
}
