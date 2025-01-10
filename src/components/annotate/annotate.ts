import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { queryAllDeeplyAssignedElements, queryDeeplyAssignedElement } from "../../helpers/decorators";
import { SpectrogramComponent } from "spectrogram/spectrogram";
import { UnitConverter } from "../../models/unitConverters";
import { Size } from "../../models/rendering";
import { AnnotationComponent } from "annotation/annotation";
import { Annotation } from "../../models/annotation";
import { booleanConverter, enumConverter } from "../../helpers/attributes";
import annotateStyles from "./css/style.css?inline";

export enum AnnotationTagStyle {
  HIDDEN = "hidden",
  EDGE = "edge",
  SPECTROGRAM_TOP = "spectrogram-top",
}

@customElement("oe-annotate")
export class AnnotateComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(annotateStyles);

  @property({ type: Boolean, converter: booleanConverter, reflect: true })
  public readonly = false;

  @property({ type: String, attribute: "tag-style", converter: enumConverter(AnnotationTagStyle) as any })
  public tagStyle: AnnotationTagStyle = AnnotationTagStyle.EDGE;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram?: SpectrogramComponent;

  @queryAllDeeplyAssignedElements({ selector: "oe-annotation" })
  private annotationElements?: AnnotationComponent[];

  private unitConverter?: UnitConverter;
  private annotationModels: Annotation[] = [];

  private handleSlotChange(): void {
    if (this.spectrogram && this.spectrogram.unitConverters) {
      this.unitConverter = this.spectrogram.unitConverters.value;

      if (this.unitConverter) {
        this.unitConverter.canvasSize.subscribe((value) => this.handleCanvasResize(value));
      }
    }

    if (this.annotationElements) {
      this.annotationModels = this.annotationElements.flatMap((element: AnnotationComponent) => element.model);
    }
  }

  private handleCanvasResize(value: Size): void {
    console.debug(value, this.annotationModels);
  }

  public render() {
    return html`
      <div class="vertically-fill">
        <slot @slotchange="${() => this.handleSlotChange()}"></slot>
      </div>
    `;
  }
}
