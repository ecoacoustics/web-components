import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { queryAllDeeplyAssignedElements, queryDeeplyAssignedElement } from "../../helpers/decorators";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { UnitConverter } from "../../models/unitConverters";
import { AnnotationComponent } from "../annotation/annotation";
import { Annotation } from "../../models/annotation";
import { booleanConverter, enumConverter } from "../../helpers/attributes";
import { map } from "lit/directives/map.js";
import { Tag } from "../../models/tag";
import { computed, watch } from "@lit-labs/preact-signals";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { when } from "lit/directives/when.js";
import { CssVariable } from "../../helpers/types/advancedTypes";
import { Size } from "../../models/rendering";
import { classMap } from "lit/directives/class-map.js";
import annotateStyles from "./css/style.css?inline";
import { loop } from "../../helpers/directives";

export enum AnnotationTagStyle {
  HIDDEN = "hidden",
  EDGE = "edge",
  SPECTROGRAM_TOP = "spectrogram-top",
}

/**
 * @description
 * Creates an annotation surface that can render annotations
 *
 * @example
 * ```html
 * <oe-annotate>
 *   <oe-spectrogram></oe-spectrogram>
 *
 *   <oe-annotation
 *     tags="laughing-kookaburra"
 *     low-frequency="0"
 *     high-frequency="10_000"
 *     start-time="30"
 *     end-time="32"
 *   ></oe-annotation>
 *
 *   <oe-annotation low-frequency="100" high-frequency="600" start-time="28.11" end-time="29.2" readonly>
 *     <oe-tag value="koala">Koala</oe-tag>
 *     <oe-tag value="kookaburra">
 *       <img src="kookaburra.png" alt="A picture of a kookaburra" />
 *     </oe-tag>
 *   </oe-annotation>
 * </oe-annotate>
 * ```
 *
 * @csspart annotation-bounding-box - The square around an annotation
 * @csspart annotation-heading - Selector for the annotation heading/labels
 *
 * @slot - A spectrogram element to add annotations to
 */
@customElement("oe-annotate")
export class AnnotateComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(annotateStyles);

  @property({ type: Boolean, converter: booleanConverter, reflect: true })
  public readonly = false;

  @property({
    type: String,
    attribute: "tag-style",
    converter: enumConverter(AnnotationTagStyle, AnnotationTagStyle.EDGE as any) as any,
  })
  public tagStyle: AnnotationTagStyle = AnnotationTagStyle.EDGE;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram?: SpectrogramComponent;

  @queryAllDeeplyAssignedElements({ selector: "oe-annotation" })
  private annotationElements?: AnnotationComponent[];

  @query(".annotation-chrome")
  private annotationSurface!: HTMLDivElement;

  private unitConverter?: UnitConverter;
  private annotationModels: Annotation[] = [];

  public handleSlotChange(): void {
    if (this.spectrogram && this.spectrogram.unitConverters) {
      this.unitConverter = this.spectrogram.unitConverters.value;

      (this.unitConverter as any).canvasSize.subscribe((value: Size) => this.handleCanvasResize(value));
      this.spectrogram.addEventListener(SpectrogramComponent.loadedEventName, () => this.handleSpectrogramUpdate());
    }

    if (this.annotationElements) {
      this.annotationModels = this.annotationElements.flatMap((element: AnnotationComponent) => element.model);
    }
  }

  private handleSpectrogramUpdate(): void {
    this.requestUpdate();
  }

  private handleCanvasResize(value: Size): void {
    const { width, height } = value;
    this.annotationSurface.style.width = `${width}px`;
    this.annotationSurface.style.height = `${height}px`;
  }

  private cullAnnotation(model: Annotation): boolean {
    if (!this.unitConverter) {
      // If there is no unit converter initialized, there is no way that we can
      // render the annotations.
      // Therefore, we can save some computation time by culling the annotation.
      return true;
    } else if (!model.valid()) {
      return true;
    }

    const temporalDomain = this.unitConverter.temporalDomain.value;
    const frequencyDomain = this.unitConverter.frequencyDomain.value;

    // TODO: I suspect that we can combine the superset check and this isVisible
    // math so that we only have to do one calculation
    //
    // TODO: we might want to make this inclusive e.g. >=
    const isTimeInView = model.startOffset < temporalDomain[1] && model.endOffset > temporalDomain[0];
    const isFrequencyInView = model.lowFrequency < frequencyDomain[1] && model.highFrequency > frequencyDomain[0];
    const isVisible = isTimeInView && isFrequencyInView;
    if (!isVisible) {
      return true;
    }

    // if the annotation is larger than the view box, then we want don't want to
    // render it
    const isSupersetOfViewBox =
      model.startOffset < temporalDomain[0] &&
      model.endOffset > temporalDomain[1] &&
      model.lowFrequency < frequencyDomain[0] &&
      model.highFrequency > frequencyDomain[1];

    return isSupersetOfViewBox;
  }

  private spectrogramTopHeadingTemplate(model: Annotation): HTMLTemplateResult {
    const headingTemplate = this.tagLabelTemplate(model);

    const left = computed(() => this.unitConverter && Math.max(this.unitConverter.scaleX.value(model.startOffset), 0));

    return html`
      <label
        class="bounding-box-heading style-spectrogram-top"
        part="annotation-heading"
        style="left: ${watch(left)}px;"
      >
        ${headingTemplate}
      </label>
    `;
  }

  private tagLabelTemplate(model: Annotation): HTMLTemplateResult {
    const isTagComponentSource =
      model.reference instanceof AnnotationComponent &&
      model.reference.tagComponents &&
      model.reference.tagComponents.length > 0;

    const tagSeparator = ", ";

    let headingTemplate = html``;
    if (isTagComponentSource) {
      headingTemplate = html`${loop<HTMLElement>(
        (model.reference as any).tagComponents,
        (element, { last }) => html`${unsafeHTML(element.innerHTML)} ${last ? "" : tagSeparator}`,
      )}`;
    } else {
      const annotationTags = model.tags.map((tag: Tag) => tag.text);
      headingTemplate = html`${annotationTags.join(tagSeparator)}`;
    }

    return headingTemplate;
  }

  private annotationTemplate(model: Annotation, index: number): HTMLTemplateResult {
    if (!this.unitConverter) {
      return html`An error occurred`;
    }

    const left = computed(() => this.unitConverter && this.unitConverter.scaleX.value(model.startOffset));
    const width = computed(
      () => this.unitConverter && this.unitConverter.scaleX.value(model.endOffset) - (left.value ?? 0),
    );

    const top = computed(() => this.unitConverter && this.unitConverter.scaleY.value(model.highFrequency));
    const height = computed(
      () => this.unitConverter && this.unitConverter.scaleY.value(model.lowFrequency) - (top.value ?? 0),
    );

    const annotationAnchorName: CssVariable = `--bounding-box-anchor-${index}`;

    const headingTemplate = this.tagLabelTemplate(model);

    const boundingBoxClasses = classMap({
      "box-style-spectrogram-top": this.tagStyle === AnnotationTagStyle.SPECTROGRAM_TOP,
    });

    return html`
      ${when(
        this.tagStyle === AnnotationTagStyle.EDGE,
        () => html`
          <label
            class="bounding-box-heading style-edge"
            part="annotation-heading"
            style="position-anchor: ${annotationAnchorName};"
          >
            ${headingTemplate}
          </label>
        `,
      )}

      <aside class="annotation-container ${boundingBoxClasses}" tabindex="0">
        <div
          class="bounding-box"
          part="annotation-bounding-box"
          style="
            left: ${watch(left)}px;
            top: ${watch(top)}px;
            width: ${watch(width)}px;
            height: ${watch(height)}px;
            anchor-name: ${annotationAnchorName};
          "
        ></div>
      </aside>
    `;
  }

  public render() {
    const visibleAnnotations = this.annotationModels.filter((model) => !this.cullAnnotation(model));

    return html`
      <div id="wrapper-element" class="vertically-fill">
        ${when(
          this.tagStyle === AnnotationTagStyle.SPECTROGRAM_TOP,
          () => html`
            <div class="headings-chrome">
              ${map(visibleAnnotations, (model: Annotation) => this.spectrogramTopHeadingTemplate(model))}
            </div>
          `,
        )}

        <div class="wrapper-chrome">
          <div class="annotation-chrome">
            ${map(visibleAnnotations, (model: Annotation, i: number) => this.annotationTemplate(model, i))}
          </div>

          <slot @slotchange="${() => this.handleSlotChange()}"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-annotate": AnnotateComponent;
  }
}
