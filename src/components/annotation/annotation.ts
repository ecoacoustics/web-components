import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { queryAllDeeplyAssignedElements, required } from "../../helpers/decorators";
import { Annotation } from "../../models/annotation";
import { Tag } from "../../models/tag";
import { booleanConverter, tagArrayConverter } from "../../helpers/attributes";
import { TagComponent } from "../tag/tag";
import { Hertz, Seconds } from "../../models/unitConverters";
import { DataComponent } from "../../helpers/dataComponent";

/**
 * @description
 * Builds an annotation model using DOM element attributes
 *
 * @fires oe-annotation-created
 * Fires when the annotation component is created
 *
 * @fires oe-annotation-updating
 * Fires when the user starts dragging / modifying the annotation
 * (not currently implemented; all annotations are readonly)
 *
 * @fires oe-annotation-updated (not implemented)
 * Fires when the low-frequency, high-frequency, start-time, end-time, or tag
 * properties are updated.
 *
 * @fires oe-annotation-removed
 * Fires when the annotation is deleted / removed from the DOM
 *
 * @fires oe-annotation-selected
 * Fires when the annotation is selected.
 * Triggered by `focus`, and also emits an `Annotation` model.
 *
 * @fires oe-annotation-deselected
 * Fires when the annotation is de-selected.
 * Triggered by `blur` and emits and `annotation` model
 *
 * @fires oe-annotation-changed
 * Fires when something about the elements lit DOM template has changed
 * E.g. the DOM node has been copied or moved.
 *
 * @slot - A slot for <oe-tag> elements
 */
@customElement("oe-annotation")
export class AnnotationComponent extends AbstractComponent(LitElement) implements DataComponent<Annotation> {
  public static readonly createdEventName = "oe-annotation-created";
  public static readonly updatedEventName = "oe-annotation-updated";
  public static readonly removedEventName = "oe-annotation-removed";
  public static readonly selectedEventName = "oe-annotation-selected";
  public static readonly deselectedEventName = "oe-annotation-deselected";

  // TODO: these events are not implemented
  public static readonly updatingEventName = "oe-annotation-updating";
  public static readonly annotationChangedEventName = "oe-annotation-changed";

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

  /**
   * Makes the annotation non-editable
   * @default true
   */
  @property({ type: Boolean, converter: booleanConverter })
  public readonly = true;

  /**
   * A comma separated list of tag names for the annotation region
   *
   * @example
   * <oe-annotation tag="koala,male"></oe-annotation>
   */
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
      {},
      [],
    );
  }

  public get selected(): Readonly<boolean> {
    return this._selected;
  }

  public set selected(value: boolean) {
    this._selected = value;

    const emittedEventName = this.selected
      ? AnnotationComponent.selectedEventName
      : AnnotationComponent.deselectedEventName;

    this.dispatchEvent(
      new CustomEvent(emittedEventName, {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _selected = false;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.dispatchEvent(
      new CustomEvent(AnnotationComponent.removedEventName, {
        bubbles: true,
        composed: true,
      }),
    );
  }

  // I fire the "oe-annotation-created" event during the firstUpdate() lifecycle
  // hook so that the created event is fired after the component has performed
  // its first update cycle.
  // If I emitted the event during the "connectedCallback" event, there is no
  // guarantee that all of the data will be on the component because the first
  // update has not been completed.
  public firstUpdated(): void {
    this.dispatchEvent(
      new CustomEvent(AnnotationComponent.createdEventName, {
        bubbles: true,
        composed: true,
      }),
    );
  }

  // I bind to the updated() event so that when the "updated" event fires,
  // this component would have applied all of the necessary changes from the
  // changed properties
  public updated(change: PropertyValues<this>): void {
    const updatedAnnotationProperties = [
      "lowFrequency",
      "highFrequency",
      "startTime",
      "endTime",
      "tags",
    ] as const satisfies (keyof this)[];

    const hasAnnotationUpdate = updatedAnnotationProperties.some((key) => key in change);
    if (hasAnnotationUpdate) {
      this.dispatchEvent(
        new CustomEvent(AnnotationComponent.updatedEventName, {
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  public tagModels(): Tag[] {
    const attributeTags = this.tags;
    const componentTags = this.tagComponents
      ? this.tagComponents.flatMap((element: TagComponent) => element.model)
      : [];

    return [...attributeTags, ...componentTags];
  }

  public render() {
    return html`<slot class="hide-slot-content"></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-annotation": AnnotationComponent;
  }
}
