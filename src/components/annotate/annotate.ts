import { html, HTMLTemplateResult, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, queryAll, queryAssignedElements } from "lit/decorators.js";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { Pixel, ScaleDomain, UnitConverter } from "../../models/unitConverters";
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
import { TagComponent } from "../tag/tag";
import { ChromeProvider } from "../../mixins/chrome/chromeProvider/chromeProvider";
import { ChromeTemplate } from "../../mixins/chrome/types";
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

  @queryAll(".bounding-box-label")
  private labelElements!: Readonly<NodeListOf<HTMLLabelElement>>;

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

  public updated(): void {
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
    const labelHeights = Array.from(this.labelElements).map((element) => element.getBoundingClientRect().height);
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
    const isSupersetOfViewBox =
      model.startOffset < temporalDomain[0] &&
      model.endOffset >= temporalDomain[1] &&
      model.lowFrequency < frequencyDomain[0] &&
      model.highFrequency >= frequencyDomain[1];

    return isSupersetOfViewBox;
  }

  private spectrogramTopLabelTemplate(model: Annotation): HTMLTemplateResult {
    const labelTemplate = this.tagLabelTemplate(model);

    const left = computed(() => this.unitConverter && Math.max(this.unitConverter.scaleX.value(model.startOffset), 0));

    return html`
      <label class="bounding-box-label style-spectrogram-top" part="annotation-label" style="left: ${watch(left)}px;">
        ${labelTemplate}
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
      return html`Attempted to render annotation before unit converter initialization`;
    }

    const { x: top, y: left, width, height } = this.unitConverter.annotationRect(model);

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

  public chromeOverlay(): ChromeTemplate {
    return html`${map(this.visibleAnnotations, (model: Annotation, i: number) => this.annotationTemplate(model, i))}`;
  }

  public chromeTop(): ChromeTemplate {
    if (this.tagStyle !== AnnotationTagStyle.SPECTROGRAM_TOP) {
      return nothing;
    }

    return html`
      <div class="labels" style="height: ${watch(this.topChromeHeight)}px">
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
