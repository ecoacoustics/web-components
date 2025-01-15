/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { queryAllDeeplyAssignedElements, queryDeeplyAssignedElement } from "../../helpers/decorators";
import { SpectrogramComponent } from "spectrogram/spectrogram";
import { Pixel, UnitConverter } from "../../models/unitConverters";
import { AnnotationComponent } from "../annotation/annotation";
import { Annotation } from "../../models/annotation";
import { booleanConverter, enumConverter } from "../../helpers/attributes";
import { map } from "lit/directives/map.js";
import { Tag } from "../../models/tag";
import { computed, watch } from "@lit-labs/preact-signals";
import annotateStyles from "./css/style.css?inline";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

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
    }

    if (this.annotationElements) {
      this.annotationModels = this.annotationElements.flatMap((element: AnnotationComponent) => element.model);
    }
  }

  private annotationTemplate(model: Annotation): HTMLTemplateResult {
    if (!this.unitConverter) {
      return html`An error occurred`;
    }

    const annotationTags = model.tags.map((tag: Tag) => tag.text);
    const textHeight: Pixel = 14.5;

    const left = computed(() => this.unitConverter!.scaleX.value(model.startOffset));
    const width = computed(() => this.unitConverter!.scaleX.value(model.endOffset) - left.value);

    const top = computed(() => this.unitConverter!.scaleY.value(model.highFrequency) - textHeight);
    const height = computed(() => this.unitConverter!.scaleY.value(model.lowFrequency) - top.value - textHeight);

    const isTagComponentSource =
      model.reference instanceof AnnotationComponent &&
      model.reference.tagComponents &&
      model.reference.tagComponents.length > 0;

    let headingTemplate = html``;
    if (isTagComponentSource) {
      headingTemplate = html`${map((model.reference as AnnotationComponent).tagComponents, (element) =>
        unsafeHTML(element.innerHTML),
      )}`;
    } else {
      headingTemplate = html`${annotationTags.join(", ")}`;
    }

    return html`
      <aside class="annotation-container" style="left: ${watch(left)}px; top: ${watch(top)}px;">
        <h2 class="bounding-box-heading">${headingTemplate}</h2>
        <div class="bounding-box" style="width: ${watch(width)}px; height: ${watch(height)}px;"></div>
      </aside>
    `;
  }

  public render() {
    return html`
      <div id="wrapper-element" class="vertically-fill">
        <div class="annotation-surface">${map(this.annotationModels, (model) => this.annotationTemplate(model))}</div>
        <slot @slotchange="${() => this.handleSlotChange()}"></slot>
      </div>
    `;
  }
}
