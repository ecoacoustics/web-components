import { html, HTMLTemplateResult, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, queryAssignedElements } from "lit/decorators.js";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { Pixel, UnitConverter } from "../../models/unitConverters";
import { AnnotationComponent } from "../annotation/annotation";
import { Annotation } from "../../models/annotation";
import { booleanConverter, enumConverter } from "../../helpers/attributes";
import { map } from "lit/directives/map.js";
import { computed, Signal, signal, watch } from "@lit-labs/preact-signals";
import { when } from "lit/directives/when.js";
import { classMap } from "lit/directives/class-map.js";
import { loop } from "../../helpers/directives";
import { ChromeProvider } from "../../mixins/chrome/chromeProvider/chromeProvider";
import { ChromeTemplate } from "../../mixins/chrome/types";
import { createRef, ref, Ref } from "lit/directives/ref.js";
import { Rect, Size } from "../../models/rendering";
import { styleMap } from "lit/directives/style-map.js";
import annotateStyles from "./css/style.css?inline";

export enum AnnotationTagStyle {
  HIDDEN = "hidden",
  EDGE = "edge",
  SPECTROGRAM_TOP = "spectrogram-top",
}

interface TemplateTagElements {
  litTemplateRef: Ref<HTMLSpanElement>;
  elementReferences: ReadonlyArray<Node>;
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
 *
 * @fires oe-annotation-created
 * @fires oe-annotation-removed
 * @fires oe-annotation-selected
 * @fires oe-annotation-deselected
 * @fires oe-annotation-changed
 *
 * @fires oe-annotation-updating (not implemented)
 * @fires oe-annotation-updated (not implemented)
 *
 * @csspart annotation-bounding-box - The "box part" of the annotation. E.g. The "green" square around the event.
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

  /**
   * Changes how to labels are displayed on annotations.
   *
   * `hidden` - All tag content/labels will be hidden. Annotation bounding boxes will still be shown.
   * `edge` - The tag content/labels will be shown on the edge of the associated bounding box
   * `spectrogram-top` - The tag content/labels will be shown above the spectrogram.
   */
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
  @property({ type: Boolean, converter: booleanConverter })
  public readonly = true;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram?: SpectrogramComponent;

  @queryAssignedElements({ selector: "oe-annotation" })
  private annotationElements?: ReadonlyArray<AnnotationComponent>;

  private readonly topChromeHeight = signal<Pixel>(0);
  private labelRefs: Ref<Readonly<HTMLLabelElement>>[] = [];
  private templateTagElements: TemplateTagElements[] = [];
  private unitConverter?: Readonly<UnitConverter>;

  private annotationUpdateEventHandler = this.handleAnnotationUpdate.bind(this);

  private get instantiatedLabelRefs() {
    return this.labelRefs.filter(
      (ref): ref is Ref<Readonly<HTMLLabelElement>> & { readonly value: HTMLElement } => ref.value !== undefined,
    );
  }

  private get annotationModels(): Annotation[] {
    if (!this.annotationElements) {
      return [];
    }

    return this.annotationElements.flatMap((element: AnnotationComponent) => element.model);
  }

  public connectedCallback() {
    super.connectedCallback();
    this.addEventListener(AnnotationComponent.updatedEventName, this.annotationUpdateEventHandler);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(AnnotationComponent.updatedEventName, this.annotationUpdateEventHandler);
  }

  public chromeRendered(): void {
    if (this.tagStyle === AnnotationTagStyle.SPECTROGRAM_TOP) {
      this.measureLabelHeight();
    } else {
      this.topChromeHeight.value = 0;
    }

    this.appendTagLabelRefs();
  }

  protected handleSlotChange(): void {
    if (!this.spectrogram) {
      console.warn("An oe-annotate component was updated without an oe-spectrogram component.");

      // we explicitly set the unit converter back to undefined so that if the
      // spectrogram component is removed (or moved/reassigned) after
      // initialization, this component won't have an outdated unit converter
      // from a moved or removed spectrogram component
      this.unitConverter = undefined;
      return;
    }

    this.spectrogram.unitConverters.subscribe((newUnitConverter?: UnitConverter) => {
      this.unitConverter = newUnitConverter;
    });

    this.spectrogram.addEventListener(SpectrogramComponent.loadedEventName, () => this.handleSpectrogramUpdate());
  }

  private handleAnnotationUpdate(): void {
    this.requestUpdate();
  }

  private handleSpectrogramUpdate(): void {
    this.requestUpdate();
  }

  private appendTagLabelRefs(): void {
    // Because the <oe-tag> component supports slotted elements, we want to
    // append the slotted oe-tag elements in the associate annotations label.
    // However, Lit doesn't support rendering HTML element reference in their
    // html templates, and using unsafeHTML and copying the innerHTML of the
    // slotted element does not preserve event listeners.
    //
    // So that event listeners and element references are preserved, we append
    // the elements after the Lit HTML templates have been rendered to the DOM.
    // At which point, we will have a reference to the Lit template element and
    // can assign each of the slotted elements to the template element.
    for (const tagElement of this.templateTagElements) {
      const litTemplateElement = tagElement.litTemplateRef.value;
      if (!litTemplateElement) {
        console.warn("A tag element was not found in the template.");
        continue;
      }

      litTemplateElement.innerHTML = "";
      litTemplateElement.append(...tagElement.elementReferences);
    }

    this.templateTagElements = [];
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

    const labelHeights = this.instantiatedLabelRefs.map((ref) => ref.value.getBoundingClientRect().height);
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

    const isTimeInView = this.unitConverter.overlapsTemporalDomain([model.startOffset, model.endOffset]);
    const isFrequencyInView = this.unitConverter.overlapsFrequencyDomain([model.lowFrequency, model.highFrequency]);
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

  private spectrogramTopLabelTemplate(model: Readonly<Annotation>): HTMLTemplateResult {
    const labelTemplate = this.tagLabelTemplate(model);

    // we know that the unitConverter is defined because the annotation will be
    // culled if the unitConverter is not defined.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const left = computed(() => Math.max(this.unitConverter!.scaleX.value(model.startOffset), 0));

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
        const tagSuffix = last ? "" : tagSeparator;

        if (Array.isArray(elementReferences) && elementReferences.length > 0) {
          const tagTemplateRef = createRef<HTMLSpanElement>();
          this.templateTagElements.push({
            litTemplateRef: tagTemplateRef,
            elementReferences,
          });

          return html`<span ${ref(tagTemplateRef)}></span>${tagSuffix}`;
        }

        return html`${tag.text}${tagSuffix}`;
      })}
    `;
  }

  private edgeLabelTemplate(model: Readonly<Annotation>, annotationRect: Readonly<Rect<Signal<Pixel>>>) {
    const { x, y } = annotationRect;

    const fontSize = { width: 12, height: 12 } as const satisfies Size<Pixel>;

    const finalX = computed(() => Math.max(x.value, 0));
    const finalY = computed(() => Math.max(y.value - fontSize.height, 0));

    const yPosAxis = finalY.value > 12 ? "top" : "bottom";

    const styles = styleMap({
      left: `${watch(finalX)}px`,
      top: `${watch(finalY)}px`
    });

    return html`
      <label
        class="bounding-box-label style-edge"
        part="annotation-label"
        style=${styles}
      >
        ${this.tagLabelTemplate(model)}
      </label>
    `;
  }

  private annotationTemplate(model: Annotation): HTMLTemplateResult {
    // we know that the unit converter will be defined when the annotation is
    // rendered because the annotation will be culled if the unit converter is
    // not defined.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const annotationRect = this.unitConverter!.annotationRect(model);
    const { x, y, width, height } = annotationRect;

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
        () => this.edgeLabelTemplate(model, annotationRect),
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
            left: ${watch(x)}px;
            top: ${watch(y)}px;
            width: ${watch(width)}px;
            height: ${watch(height)}px;
          "
        ></div>
      </aside>
    `;
  }

  public chromeOverlay(): ChromeTemplate {
    return html`
      <div class="annotations-surface">
        ${map(this.annotationModels, (model: Annotation) =>
          this.shouldCullAnnotation(model) ? nothing : this.annotationTemplate(model),
        )}
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
    this.templateTagElements = [];

    if (this.tagStyle !== AnnotationTagStyle.SPECTROGRAM_TOP) {
      return nothing;
    }

    return html`
      <div class="labels-top-chrome" style="height: ${watch(this.topChromeHeight)}px">
        ${map(this.annotationModels, (model: Annotation) =>
          this.shouldCullAnnotation(model) ? nothing : this.spectrogramTopLabelTemplate(model),
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-annotate": AnnotateComponent;
  }
}
