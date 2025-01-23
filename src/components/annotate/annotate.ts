import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { customElement, property, query, queryAll } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { queryAllDeeplyAssignedElements, queryDeeplyAssignedElement } from "../../helpers/decorators";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { AngleDegrees, Pixel, UnitConverter } from "../../models/unitConverters";
import { AnnotationComponent } from "../annotation/annotation";
import { Annotation } from "../../models/annotation";
import { booleanConverter, enumConverter } from "../../helpers/attributes";
import { map } from "lit/directives/map.js";
import { computed, signal, watch } from "@lit-labs/preact-signals";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { when } from "lit/directives/when.js";
import { CssVariable } from "../../helpers/types/advancedTypes";
import { Size } from "../../models/rendering";
import { classMap } from "lit/directives/class-map.js";
import { loop } from "../../helpers/directives";
import { TagComponent } from "../tag/tag";
import annotateStyles from "./css/style.css?inline";

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
 * @fires oe-annotation-created
 * @fires oe-annotation-updating (not implemented)
 * @fires oe-annotation-updated (not implemented)
 * @fires oe-annotation-removed
 * @fires oe-annotation-selected
 * @fires oe-annotation-deselected
 * @fires oe-annotation-changed
 *
 * @csspart annotation-bounding-box - The square around an annotation
 * @csspart annotation-heading - Selector for the annotation heading/labels
 *
 * @cssproperty [--oe-annotation-color]
 * @cssproperty [--oe-annotation-font-color]
 * @cssproperty [--oe-annotation-weight]
 * @cssproperty [--oe-annotation-focus-color]
 *
 * @slot - A spectrogram element to add annotations to
 */
@customElement("oe-annotate")
export class AnnotateComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(annotateStyles);

  @property({
    type: String,
    attribute: "tag-style",
    converter: enumConverter(AnnotationTagStyle, AnnotationTagStyle.EDGE as any) as any,
  })
  public tagStyle: AnnotationTagStyle = AnnotationTagStyle.EDGE;

  /**
   * Makes all annotations readonly, can be overwritten by setting
   * readonly="false" on the `oe-annotation` component
   * (not currently implemented; all annotations are readonly)
   *
   * @default true
   */
  @property({ type: Boolean, converter: booleanConverter, reflect: true })
  public readonly = true;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram?: SpectrogramComponent;

  @queryAllDeeplyAssignedElements({ selector: "oe-annotation" })
  private annotationElements?: AnnotationComponent[];

  @queryAll(".bounding-box-heading")
  private headingElements!: Readonly<NodeListOf<HTMLLabelElement>>;

  @query(".annotation-chrome")
  private annotationSurface!: HTMLDivElement;

  private readonly headingChromeHeight = signal<Pixel>(0);
  private unitConverter?: UnitConverter;
  private annotationModels: Annotation[] = [];
  private resizeChromeNextUpdate = false;

  public updated(): void {
    if (this.resizeChromeNextUpdate) {
      this.resizeChromeNextUpdate = false;
      this.resizeChrome();
    }
  }

  public handleSlotChange(): void {
    if (this.spectrogram && this.spectrogram.unitConverters) {
      this.unitConverter = this.spectrogram.unitConverters.value;

      (this.unitConverter as any).canvasSize.subscribe((value: Size) => this.handleCanvasResize(value));
      this.spectrogram.addEventListener(SpectrogramComponent.loadedEventName, () => this.handleSpectrogramUpdate());
    }

    if (this.annotationElements) {
      this.annotationModels = this.annotationElements.flatMap((element: AnnotationComponent) => element.model);
    }

    // we resize the chrome regardless of if there are annotation elements
    // because if all the slotted annotation elements are removed, we want to
    // remove all the chrome
    // this.resizeChrome();
    this.resizeChromeNextUpdate = true;
  }

  private handleSpectrogramUpdate(): void {
    this.requestUpdate();
  }

  private handleCanvasResize(value: Size): void {
    const { width, height } = value;
    this.annotationSurface.style.width = `${width}px`;
    this.annotationSurface.style.height = `${height}px`;

    this.resizeChromeNextUpdate = true;
  }

  private resizeChrome(): void {
    const boundingBoxes = Array.from(this.headingElements).map((element) => element.getBoundingClientRect());

    // TODO: I might be able to improve some of the math logic
    let maximumHeight = -Infinity;
    boundingBoxes.forEach((bounds) => {
      // 1. we first have to calculate how much height the heading has
      // 2. then we calculate how much height the 20 degree angle creates
      // 3. we add the two heights together to get the chrome height required
      // 4. we set the chrome height to the maximum of these values

      const headingAngle = 20 satisfies AngleDegrees;

      // 1.
      const hypotOppositeAngle: AngleDegrees = 90 - headingAngle;
      const innerAngle: AngleDegrees = 90 - hypotOppositeAngle;
      const headingHeight: Pixel = Math.cos(innerAngle) * bounds.height;

      // 2.
      const labelHeight: Pixel = Math.sin(headingAngle) * bounds.width;

      // 3.
      const totalHeight: Pixel = headingHeight + labelHeight;

      if (totalHeight > maximumHeight) {
        maximumHeight = totalHeight;
      }
    });

    // 4.
    this.headingChromeHeight.value = maximumHeight;
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
    const tagSeparator = ",";

    return html`
      ${loop(model.tags, (tag, { last }) => {
        if (tag.reference instanceof TagComponent) {
          const tagElement = tag.reference;
          return html`${unsafeHTML(tagElement.getHTML().trim())}${last ? "" : tagSeparator}`;
        }

        return html`${tag.text}${last ? "" : tagSeparator}`;
      })}
    `;
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

    const focusCallback = (targetModel: Annotation, selected: boolean) => {
      if (targetModel.reference instanceof AnnotationComponent) {
        targetModel.reference.selected = selected;
      } else {
        const emittedEventName = selected
          ? AnnotationComponent.selectedEventName
          : AnnotationComponent.deselectedEventName;

        this.dispatchEvent(
          new CustomEvent(emittedEventName, {
            bubbles: true,
          }),
        );
      }
    };

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

      <aside
        class="annotation-container ${boundingBoxClasses}"
        tabindex="0"
        @focus="${() => focusCallback(model, true)}"
        @blur="${() => focusCallback(model, false)}"
      >
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
            <div class="headings-chrome" style="height: ${watch(this.headingChromeHeight)}px">
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
