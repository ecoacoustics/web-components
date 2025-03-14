import { html, HTMLTemplateResult, LitElement, nothing, PropertyValues, unsafeCSS } from "lit";
import { customElement, property, query, queryAssignedElements } from "lit/decorators.js";
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
import { Rect, RenderCanvasSize } from "../../models/rendering";
import { styleMap } from "lit/directives/style-map.js";
import { Styles } from "../../helpers/types/lit";
import annotateStyles from "./css/style.css?inline";

export enum AnnotationTagStyle {
  HIDDEN = "hidden",
  EDGE = "edge",
  SPECTROGRAM_TOP = "spectrogram-top",
}

/**
 * @description
 * Label positioning for annotation labels.
 * The numbers associated with each label position is the priority of the
 * label position.
 * The lower the number, the more we prefer that label position.
 */
enum EdgeLabelPosition {
  TOP_LEFT = 0,
  BOTTOM_RIGHT = 1,
  INLINE_TOP = 2,
}

enum SpectrogramTopLabelPosition {
  DEFAULT = 100,
}

interface TemplateTagElement {
  readonly litTemplateRef: Ref<HTMLSpanElement>;
  readonly elementReferences: ReadonlyArray<Node> | undefined;
}

interface LabelElement {
  readonly litTemplateRef: Ref<HTMLLabelElement>;

  /**
   * A signal that can be used to update the labels position.
   * This is a targeted operation and should not cause the entire component to
   * re-render.
   */
  readonly position: Signal<EdgeLabelPosition | SpectrogramTopLabelPosition>;
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

  @query("#annotations-surface")
  private annotationsSurface!: HTMLDivElement;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram?: SpectrogramComponent;

  @queryAssignedElements({ selector: "oe-annotation" })
  private annotationElements?: ReadonlyArray<AnnotationComponent>;

  private readonly topChromeHeight = signal<Pixel>(0);
  private labelElements: LabelElement[] = [];
  private templateTagElements: TemplateTagElement[] = [];
  private unitConverter?: Readonly<UnitConverter>;
  private tagOverflowObserver?: IntersectionObserver;

  private annotationUpdateEventHandler = this.handleAnnotationUpdate.bind(this);

  private get labelRefs(): Ref<HTMLLabelElement>[] {
    return this.labelElements.map((element) => element.litTemplateRef);
  }

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
    this.tagOverflowObserver?.disconnect();
  }

  public firstUpdated(change: PropertyValues<this>): void {
    super.firstUpdated(change);

    this.tagOverflowObserver = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        for (const entry of entries) {
          if (entry.intersectionRatio < 1) {
            this.handleLabelIntersection(entry);
          }
        }
      },
      {
        root: this.annotationsSurface,
        threshold: 0,
      },
    );
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

      if (tagElement?.elementReferences !== undefined) {
        // litTemplateElement.innerHTML = "";
        litTemplateElement.append(...tagElement.elementReferences);
      }
    }

    this.templateTagElements = [];

    for (const labelElement of this.labelElements) {
      const nativeElement = labelElement.litTemplateRef.value;
      if (!nativeElement) {
        continue;
      }

      this.tagOverflowObserver?.observe(nativeElement);
    }
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
    this.labelElements.push({
      litTemplateRef: labelRef,
      position: signal(SpectrogramTopLabelPosition.DEFAULT),
    });

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
    const tagSeparator = ", ";

    return html`
      ${loop(model.tags, (tag, { last }) => {
        const elementReferences = tag.elementReferences;
        const tagSuffix = last ? "" : tagSeparator;

        const tagTemplateRef = createRef<HTMLSpanElement>();
        this.templateTagElements.push({
          litTemplateRef: tagTemplateRef,
          elementReferences,
        });

        return html`<span ${ref(tagTemplateRef)}>${tag.text}</span>${tagSuffix}`;
      })}
    `;
  }

  // I have extracted the edge label styles into a separate function so that
  // we can short circuit the first time that we find a style that fits.
  private edgeLabelStyles(
    position: EdgeLabelPosition,
    annotationRect: Readonly<Rect<Signal<Pixel>>>,
    canvasSize: Readonly<Signal<RenderCanvasSize>>,
  ): Styles {
    // we used to position edge labels using CSS anchor positioning
    // however, Firefox and Safari did not support anchor positioning
    // so we transitioned to a JavaScript implementation.
    //
    // However, the old method was tried and tested, so therefore, I want to
    // replicate the following position-try values;
    // position-try: flip-block, flip-inline, --position-float-top;
    //
    // where --position-float-top is
    // @position-try --position-float-top {
    //   top: 0px;
    //   bottom: initial;
    // }

    // I subtract the annotation weight from some of these positions because
    // the annotations border is not included in the box models content box.
    // Meaning that if we do left: 0px, the label will not be positioned flush
    // with the annotations border edge.
    switch (position) {
      case EdgeLabelPosition.TOP_LEFT: {
        return this.topLeftLabelStyles(annotationRect, canvasSize);
      }

      case EdgeLabelPosition.BOTTOM_RIGHT: {
        return this.bottomRightLabelStyles(annotationRect, canvasSize);
      }

      case EdgeLabelPosition.INLINE_TOP: {
        return this.inlineLabelStyles(annotationRect);
      }

      default: {
        throw new Error("Invalid label position");
      }
    }
  }

  private topLeftLabelStyles(
    annotationRect: Readonly<Rect<Signal<Pixel>>>,
    canvasSize: Readonly<Signal<RenderCanvasSize>>,
  ): Styles {
    return {
      top: "0px",
      // transform: "translateY(-100%)",
      // left:
      //   annotationRect.x.value > 0
      //     ? "calc(var(--oe-annotation-weight) * -1)"
      //     : `calc(${Math.abs(annotationRect.x.value)}px - var(--oe-annotation-weight))`,

      transform:
        annotationRect.x.value + annotationRect.width.value > canvasSize.value.width
          ? "translateY(-100%) translateX(-100%)"
          : "translateY(-100%)",
      left:
        annotationRect.x.value > 0
          ? annotationRect.x.value + annotationRect.width.value > canvasSize.value.width
            ? `calc(${canvasSize.value.width - annotationRect.x.value}px - (var(--oe-annotation-weight) * -1))`
            : "calc(var(--oe-annotation-weight) * -1)"
          : `calc(${Math.abs(annotationRect.x.value)}px - var(--oe-annotation-weight))`,
    };
  }

  private bottomRightLabelStyles(
    annotationRect: Readonly<Rect<Signal<Pixel>>>,
    canvasSize: Readonly<Signal<RenderCanvasSize>>,
  ): Styles {
    return {
      bottom: "0px",
      transform:
        annotationRect.x.value + annotationRect.width.value > canvasSize.value.width
          ? "translateY(100%) translateX(-100%)"
          : "translateY(100%)",
      left:
        annotationRect.x.value > 0
          ? annotationRect.x.value + annotationRect.width.value > canvasSize.value.width
            ? `calc(${canvasSize.value.width - annotationRect.x.value}px - (var(--oe-annotation-weight) * -1))`
            : "calc(var(--oe-annotation-weight) * -1)"
          : `calc(${Math.abs(annotationRect.x.value)}px - var(--oe-annotation-weight))`,
    };
  }

  private inlineLabelStyles(annotationRect: Readonly<Rect<Signal<Pixel>>>): Styles {
    return {
      top:
        annotationRect.y.value > 0
          ? "calc(var(--oe-annotation-weight) * -1)"
          : `calc(${Math.abs(annotationRect.y.value)}px - var(--oe-annotation-weight))`,
      transform: annotationRect.y.value > 0 ? "translateY(100%)" : "initial",
      left: "0px",
    };
  }

  /**
   * Uses some basic heuristics to determine what label positions are likely
   * not to fit this is useful for reducing the number of label re-positions
   * during renders
   */
  private approximateLabelPosition(
    annotationRect: Readonly<Rect<Signal<Pixel>>>,
    canvasSize: Readonly<Signal<RenderCanvasSize>>,
  ): Signal<EdgeLabelPosition> {
    const fitsTopLeft = annotationRect.y.value > 0;
    if (fitsTopLeft) {
      return signal(EdgeLabelPosition.TOP_LEFT);
    }

    // flip-block
    // Flipping the block alignment means moving the label from the top of the
    // annotation to the bottom.
    // If it is still inside the container, then we can accept the position
    // fallback.
    // This is the most common positioning fallback.
    const fitsBottomRight = annotationRect.y.value + annotationRect.height.value < canvasSize.value.height;
    if (fitsBottomRight) {
      return signal(EdgeLabelPosition.BOTTOM_RIGHT);
    }

    // --position-float-top
    // The last positioning that we try is a custom positioning method where
    // the label is positioned at the top of the annotation surface.
    // This is the last common positioning fallback because the label ends up
    // covering some of the annotation.
    return signal(EdgeLabelPosition.INLINE_TOP);
  }

  private handleLabelIntersection(label: IntersectionObserverEntry): void {
    const labelElement = this.labelElements.find((element) => element.litTemplateRef.value === label.target);
    if (!labelElement) {
      console.warn("could not find overflowing label element");
      return;
    }

    this.tryNextLabelPosition(labelElement);
  }

  private tryNextLabelPosition(labelElement: LabelElement): void {
    const currentPosition = labelElement.position.value;
    if (currentPosition === SpectrogramTopLabelPosition.DEFAULT) {
      return;
    }

    const nextLabelPosition = currentPosition + 1;

    if (nextLabelPosition > EdgeLabelPosition.INLINE_TOP) {
      console.warn("Could not find a suitable label position for the annotation.");
      return;
    }

    labelElement.position.value = nextLabelPosition;
  }

  private edgeLabelTemplate(
    model: Readonly<Annotation>,
    annotationRect: Readonly<Rect<Signal<Pixel>>>,
    canvasSize: Readonly<Signal<RenderCanvasSize>>,
  ) {
    const initialPosition = this.approximateLabelPosition(annotationRect, canvasSize);
    const styles = computed(() => styleMap(this.edgeLabelStyles(initialPosition.value, annotationRect, canvasSize)));

    const labelRef = createRef<HTMLLabelElement>();
    this.labelElements.push({
      litTemplateRef: labelRef,
      position: initialPosition,
    });

    // we use the "watch" directive here so that only the styles are updated
    // when the is position changed, meaning that lit doesn't have to re-render
    // the entire component or annotation.
    return html`
      <label
        class="bounding-box-label style-edge"
        part="annotation-label"
        style=${watch(styles)}
        ${ref(labelRef)}
      >
        ${this.tagLabelTemplate(model)}
      </label>
    `;
  }

  private annotationTemplate(model: Annotation): HTMLTemplateResult {
    // we know that the unit converter will be defined when the annotation is
    // rendered because the annotation will be culled if the unit converter is
    // not defined.
    if (!this.unitConverter) {
      console.error("The unit converter is not defined. Cannot render annotations.");
      return html``;
    }

    const canvasSize = this.unitConverter.canvasSize;
    const annotationRect = this.unitConverter.annotationRect(model);
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
        <div class="bounding-box" part="annotation-bounding-box">
          ${when(this.tagStyle === AnnotationTagStyle.EDGE, () =>
            this.edgeLabelTemplate(model, annotationRect, canvasSize),
          )}
        </div>
      </aside>
    `;
  }

  public chromeOverlay(): ChromeTemplate {
    this.labelElements = [];

    return html`
      <div id="annotations-surface">
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
    this.labelElements = [];
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
