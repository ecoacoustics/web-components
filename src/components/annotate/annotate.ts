import { html, HTMLTemplateResult, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, queryAssignedElements } from "lit/decorators.js";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { Pixel, UnitConverter } from "../../models/unitConverters";
import { AnnotationComponent } from "../annotation/annotation";
import { Annotation } from "../../models/annotation";
import { booleanConverter, enumConverter } from "../../helpers/attributes";
import { map } from "lit/directives/map.js";
import { computed, signal, watch } from "@lit-labs/preact-signals";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { when } from "lit/directives/when.js";
import { CssVariable } from "../../helpers/types/advancedTypes";
import { classMap } from "lit/directives/class-map.js";
import { loop } from "../../helpers/directives";
import { ChromeProvider } from "../../mixins/chrome/chromeProvider/chromeProvider";
import { ChromeTemplate } from "../../mixins/chrome/types";
import { createRef, ref, Ref } from "lit/directives/ref.js";
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
 * This component must wrap an element that implements the ChromeHost mixin
 *
 * @example
 * ```html
 * <oe-annotate>
 *   <oe-spectrogram></oe-spectrogram>
 *
 *   <oe-annotation
 *     tags="laughing-kookaburra"
 *     low-frequency="0"
 *     high-frequency="10000"
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
 * @csspart annotation-bounding-box - The "box part" of the annotation. The "green" square around the annotated event
 * @csspart annotation-label - Selector for the annotation label
 *
 * @cssproperty [--oe-annotation-color]
 * @cssproperty [--oe-annotation-font-color]
 * @cssproperty [--oe-annotation-weight]
 * @cssproperty [--oe-annotation-selected-color]
 *
 * @slot - A spectrogram element to add annotations to
 */
@customElement("oe-annotate")
export class AnnotateComponent extends ChromeProvider(LitElement) {
  public static styles = unsafeCSS(annotateStyles);

  @property({
    type: String,
    attribute: "tag-style",
    converter: enumConverter(AnnotationTagStyle, AnnotationTagStyle.EDGE),
  })
  public tagStyle: AnnotationTagStyle = AnnotationTagStyle.EDGE;

  /**
   * Makes all annotations readonly
   * (not currently implemented; all annotations are readonly)
   *
   * @default true
   */
  @property({ type: Boolean, converter: booleanConverter, reflect: true })
  public readonly = true;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram?: SpectrogramComponent;

  @queryAssignedElements({ selector: "oe-annotation" })
  private annotationElements?: AnnotationComponent[];

  private labelRefs: Ref<HTMLLabelElement>[] = [];

  private readonly topChromeHeight = signal<Pixel>(0);
  private unitConverter?: UnitConverter;

  public get visibleAnnotations(): Annotation[] {
    return this.annotationModels.filter((model) => !this.shouldCullAnnotation(model));
  }

  private get annotationModels(): Annotation[] {
    if (!this.annotationElements) {
      return [];
    }

    return this.annotationElements.flatMap((element: AnnotationComponent) => element.model);
  }

  public chromeRendered(): void {
    this.measureLabelHeight();
  }

  protected handleSlotChange(): void {
    if (!this.spectrogram) {
      console.warn("An oe-annotate component was updated without an oe-spectrogram component.");
      return;
    }

    this.spectrogram.unitConverters.subscribe((newUnitConverter?: UnitConverter) => {
      this.unitConverter = newUnitConverter;
      this.unitConverter?.canvasSize.subscribe(() => this.handleCanvasResize());
    });

    this.spectrogram.addEventListener(SpectrogramComponent.loadedEventName, () => this.handleSpectrogramUpdate());
  }

  private handleSpectrogramUpdate(): void {
    this.requestUpdate();
  }

  private handleCanvasResize(): void {
    this.requestUpdate();
  }

  private measureLabelHeight(): void {
    // if there are no labels to measure, we can short circuit and set the top
    // chrome height to 0.
    // if we removed this check, the Math.max below would return -Infinity
    // if there were no labels.
    if (this.labelRefs.length === 0) {
      this.topChromeHeight.value = 0;
      return;
    }

    const labelHeights = this.labelRefs.map((element) => element.value?.getBoundingClientRect().height ?? 0);
    this.topChromeHeight.value = Math.max(...labelHeights);
  }

  private shouldCullAnnotation(model: Annotation): boolean {
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
    const isTimeInView = model.startOffset < temporalDomain[1] && model.endOffset >= temporalDomain[0];
    const isFrequencyInView = model.lowFrequency < frequencyDomain[1] && model.highFrequency >= frequencyDomain[0];
    const isVisible = isTimeInView && isFrequencyInView;
    if (!isVisible) {
      return true;
    }

    // if the annotation is larger than the view box, then we want don't want to
    // render it
    // const isSupersetOfViewBox =
    //   model.startOffset < temporalDomain[0] &&
    //   model.endOffset > temporalDomain[1] &&
    //   model.lowFrequency < frequencyDomain[0] &&
    //   model.highFrequency > frequencyDomain[1];
    const isSupersetOfViewBox =
      model.startOffset < temporalDomain[0] &&
      model.endOffset >= temporalDomain[1] &&
      model.lowFrequency < frequencyDomain[0] &&
      model.highFrequency >= frequencyDomain[1];

    // const isSupersetOfViewBox = false;

    return isSupersetOfViewBox;
  }

  private spectrogramTopLabelTemplate(model: Annotation): HTMLTemplateResult {
    const labelTemplate = this.tagLabelTemplate(model);

    const left = computed(() => this.unitConverter && Math.max(this.unitConverter.scaleX.value(model.startOffset), 0));

    const labelRef = createRef<HTMLLabelElement>();
    this.labelRefs.push(labelRef);

    return html`
      <label
        class="bounding-box-label style-spectrogram-top"
        part="annotation-label"
        style="left: ${watch(left)}px;"
        ${ref(labelRef)}
      >
        ${labelTemplate}
      </label>
    `;
  }

  private tagLabelTemplate(model: Annotation): HTMLTemplateResult {
    const tagSeparator = ",";

    return html`
      ${loop(model.tags, (tag, { last }) => {
        const elementReferences = tag.elementReferences;
        if (Array.isArray(elementReferences) && elementReferences.length > 0) {
          return elementReferences.map(
            (element: Element) => html`${unsafeHTML(element.outerHTML)}${last ? "" : tagSeparator}`,
          );
        }

        return html`${tag.text}${last ? "" : tagSeparator}`;
      })}
    `;
  }

  private annotationTemplate(model: Annotation, index: number): HTMLTemplateResult {
    if (!this.unitConverter) {
      return html`Attempted to render annotation before unit converter initialization`;
    }

    const { x, y, width, height } = this.unitConverter.annotationRect(model);

    const annotationAnchorName: CssVariable = `--bounding-box-anchor-${index}`;

    const labelTemplate = this.tagLabelTemplate(model);

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
            class="bounding-box-label style-edge"
            part="annotation-label"
            style="position-anchor: ${annotationAnchorName};"
          >
            ${labelTemplate}
          </label>
        `,
      )}

      <aside
        class="annotation-container ${boundingBoxClasses}"
        tabindex="0"
        @focus="${() => focusCallback(model, true)}"
        @blur="${() => focusCallback(model, false)}"
        style="
          left: ${watch(x)}px;
          top: ${watch(y)}px;
          width: ${watch(width)}px;
          height: ${watch(height)}px;
        "
      >
        <div class="bounding-box" part="annotation-bounding-box" style="anchor-name: ${annotationAnchorName};"></div>
      </aside>
    `;
  }

  public chromeOverlay(): ChromeTemplate {
    return html`
      <div class="annotations-surface">
        ${map(this.visibleAnnotations, (model: Annotation, i: number) => this.annotationTemplate(model, i))}
      </div>
    `;
  }

  public chromeTop(): ChromeTemplate {
    // because the labelRefs array is dynamically populated by the
    // spectrogramTopLabelTemplate function, we have to destroy all labelRefs
    // when the template is re-rendered.
    // we also set the labelRefs array to an empty array if the tagStyle is not
    // spectrogram-top because the references will no longer exist.
    this.labelRefs = [];

    if (this.tagStyle !== AnnotationTagStyle.SPECTROGRAM_TOP) {
      return nothing;
    }

    return html`
      <div class="labels-top-chrome" style="height: ${watch(this.topChromeHeight)}px">
        ${map(this.visibleAnnotations, (model: Annotation) => this.spectrogramTopLabelTemplate(model))}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-annotate": AnnotateComponent;
  }
}
