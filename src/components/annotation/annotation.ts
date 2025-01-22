import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { queryAllDeeplyAssignedElements, required } from "../../helpers/decorators";
import { Annotation } from "../../models/annotation";
import { Tag } from "../../models/tag";
import { tagArrayConverter } from "../../helpers/attributes";
import { TagComponent } from "../tag/tag";
import { Hertz, Seconds } from "../../models/unitConverters";

/**
 * @description
 * Builds an annotation model using DOM element attributes
 *
 * @slot - A slot for <oe-tag> elements
 */
@customElement("oe-annotation")
export class AnnotationComponent extends AbstractComponent(LitElement) {
  @required()
  @property({ attribute: "low-frequency", type: Number, reflect: true })
  public lowFrequency!: Hertz;

  @required()
  @property({ attribute: "high-frequency", type: Number, reflect: true })
  public highFrequency!: Hertz;

  @required()
  @property({ attribute: "start-time", type: Number, reflect: true })
  public startTime!: Seconds;

  @required()
  @property({ attribute: "end-time", type: Number, reflect: true })
  public endTime!: Seconds;

  @property({ type: Array, converter: tagArrayConverter })
  public tags: Tag[] = [];

  @queryAllDeeplyAssignedElements({ selector: "oe-tag" })
  public readonly tagComponents?: ReadonlyArray<TagComponent>;

  public get model(): Readonly<Annotation> {
    return new Annotation(
      this.startTime,
      this.endTime,
      this.lowFrequency,
      this.highFrequency,
      this.tagModels(),
      this,
      [],
    );
  }

  public tagModels(): Tag[] {
    const attributeTags = this.tags;
    const componentTags = this.tagComponents
      ? this.tagComponents.flatMap((element: TagComponent) => element.model)
      : [];

    return [...attributeTags, ...componentTags];
  }

  public render() {
    return html`<slot class="hide-slot"></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-annotation": AnnotationComponent;
  }
}
