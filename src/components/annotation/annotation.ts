import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { queryAllDeeplyAssignedElements, required } from "../../helpers/decorators";
import { Annotation } from "../../models/annotation";
import { Tag } from "../../models/tag";
import { tagArrayConverter } from "../../helpers/attributes";
import { TagComponent } from "tag/tag";
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

  @property({ type: Array, converter: tagArrayConverter })
  public tags: Tag[] = [];

  @queryAllDeeplyAssignedElements({ selector: "oe-tag" })
  private tagComponents?: TagComponent[];

  public get tagModels(): Tag[] {
    const attributeTags = this.tags;
    const componentTags = this.tagComponents
      ? this.tagComponents.flatMap((element: TagComponent) => element.model)
      : [];

    return [...attributeTags, ...componentTags];
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
    return html`<slot></slot>`;
  }
}
