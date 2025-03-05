import { html, HTMLTemplateResult, LitElement, nothing, PropertyValues, svg, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { SpectrogramComponent } from "spectrogram/spectrogram";
import {
  Hertz,
  TemporalScale,
  FrequencyScale,
  Seconds,
  UnitConverter,
  ScaleDomain,
  ScaleRange,
  EmUnit,
} from "../../models/unitConverters";
import { booleanConverter } from "../../helpers/attributes";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { Size } from "../../models/rendering";
import { hertzToMHertz } from "../../helpers/converters";
import { ChromeProvider } from "../../mixins/chrome/chromeProvider/chromeProvider";
import { map } from "lit/directives/map.js";
import { ChromeTemplate } from "../../mixins/chrome/types";
import axesStyles from "./css/style.css?inline";

// TODO: this component should have optimized rendering so that it doesn't
// attempt to re-render an axes that will result in the same template
// this is not currently the result as it will re-render the axes every time
// the spectrogram slot changes or the unit converter updates any values
// which are used in the axes rendering
// see: https://github.com/ecoacoustics/web-components/issues/85

/**
 * @description
 * X and Y axis grid lines showing duration and frequency of a spectrogram
 *
 * This component must wrap an element that implements the ChromeHost mixin
 *
 * @example
 * ```html
 * <oe-axes x-axis y-axis="false">
 *     <oe-spectrogram src="/example.flac"></oe-spectrogram>
 * </oe-axes>
 * ```
 *
 * @csspart tick - Apply styles to both x and y tick lines
 * @csspart x-tick - Apply styles to only the x axis tick lines
 * @csspart y-tick - Apply styles to only the y axis tick lines
 *
 * @csspart grid - Apply styles to both x and y grid lines
 * @csspart x-grid - Apply styles to only the x grid lines
 * @csspart y-grid - Apply styles to only the y grid lines
 *
 * @csspart label - Apply styles to both x and y labels
 * @csspart x-label - Apply styles to only the x axis label
 * @csspart y-label - Apply styles to only the x axis label
 *
 * @csspart legend - Apply styles to both the x and y legends
 * @csspart x-legend - Apply styles to only the x axis legend
 * @csspart y-legend - Apply styles to only the x axis legend
 *
 * @slot - A spectrogram element to add axes to
 */
@customElement("oe-axes")
export class AxesComponent extends SignalWatcher(ChromeProvider(LitElement)) {
  public static styles = unsafeCSS(axesStyles);

  public static fontCanvas: HTMLCanvasElement = document.createElement("canvas");

  // label padding is the minimum additional distance between the labels
  // while the titleOffset is the distance between the axis title and the axis labels
  private static labelPadding: EmUnit = 0.25;
  private static tickSize: EmUnit = 0.75;
  private static titleOffset: EmUnit = 0.25;

  /** The step size for the x-axis */
  @property({ attribute: "x-step", type: Number, reflect: true })
  public xStepOverride?: Seconds;

  /** The step size for the y-axis */
  @property({ attribute: "y-step", type: Number, reflect: true })
  public yStepOverride?: Hertz;

  /** The text to show next to the x-axis */
  @property({ attribute: "x-title", type: String, reflect: true })
  public xTitle = "Time (Seconds)";

  /** The text to show next to the y-axis */
  @property({ attribute: "y-title", type: String, reflect: true })
  public yTitle = "Frequency (KHz)";

  /** Whether to show/hide the x-axis title */
  @property({ attribute: "x-title-visible", converter: booleanConverter })
  public showXTitle = true;

  /** Whether to show/hide the y-axis title */
  @property({ attribute: "y-title-visible", converter: booleanConverter })
  public showYTitle = true;

  /** Shows/hides x-axis labels and ticks */
  @property({ attribute: "x-axis", converter: booleanConverter })
  public showXAxis = true;

  /** Shows/hides y-axis labels and ticks */
  @property({ attribute: "y-axis", converter: booleanConverter })
  public showYAxis = true;

  /** Shows/hides x-axis labels and grid lines */
  @property({ attribute: "x-grid", converter: booleanConverter })
  public showXGrid = true;

  /** Shows/hides y-axis labels and grid lines */
  @property({ attribute: "y-grid", converter: booleanConverter })
  public showYGrid = true;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram?: Readonly<SpectrogramComponent>;

  @state()
  private unitConverter?: Readonly<UnitConverter>;

  // if we do not know the text that we want to measure, we use one large
  // character as an upper bound estimate of the size of characters
  // using the default case should only ever be used for estimates and measuring
  // against actual text values is recommended
  // I have this as a private property so that we don't have to re-calculate the
  // value every time we need to use it
  private emUnitFontSize!: Size;
  private xAxisTemplate!: HTMLTemplateResult;
  private yAxisTemplate!: HTMLTemplateResult;

  // because label padding is a relative fraction, we need to calculate the
  // actual pixel value of the padding
  private get labelPadding(): Size {
    const fontSize = this.emUnitFontSize;
    return {
      width: fontSize.width * AxesComponent.labelPadding,
      height: fontSize.height * AxesComponent.labelPadding,
    };
  }

  private get tickSize(): Size {
    const fontSize = this.emUnitFontSize;
    return {
      width: fontSize.width * AxesComponent.tickSize,
      height: fontSize.height * AxesComponent.tickSize,
    };
  }

  private get titleOffset(): Size {
    const fontSize = this.emUnitFontSize;
    return {
      width: fontSize.width * AxesComponent.titleOffset,
      height: fontSize.height * AxesComponent.titleOffset,
    };
  }

  public firstUpdated(change: PropertyValues<this>): void {
    super.firstUpdated(change);
    this.emUnitFontSize = this.calculateFontSize("M");
  }

  protected handleSlotChange(): void {
    if (!this.spectrogram) {
      console.warn("An oe-axes component was updated without an oe-spectrogram component.");

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
  }

  // because querying the DOM for the font size will cause a repaint and reflow
  // we calculate the value once using a canvas
  private calculateFontSize(text: string): Size {
    const element = document.createElement("canvas");
    const context = element.getContext("2d") as CanvasRenderingContext2D;
    context.font = "var(--oe-font-size) var(--oe-font-family)";

    const measurements = context.measureText(text);
    const width = measurements.width;
    const height = measurements.actualBoundingBoxAscent + measurements.actualBoundingBoxDescent;

    return { width, height };
  }

  private createGridLinesTemplate(
    xValues: ReadonlyArray<Seconds>,
    yValues: ReadonlyArray<Hertz>,
    canvasSize: Readonly<Size>,
  ) {
    const xGridLineTemplate = (value: Seconds) => {
      // we pull out xPosition to a variable because we use it twice (without modification)
      // for the lines x1 and x2 position
      // by pulling it out to a separate variable, we can avoid recalculating the value twice
      const xPosition = this.unitConverter?.scaleX.value(value);
      return svg`<line
        x1="${xPosition}"
        x2="${xPosition}"
        y1="0"
        y2="${canvasSize.height}"
        class="grid-line"
      ></line>`;
    };

    const yGridLineTemplate = (value: Hertz) => {
      const yPosition = this.unitConverter?.scaleY.value(value);
      return svg`<line
        x1="0"
        x2="${canvasSize.width}"
        y1="${yPosition}"
        y2="${yPosition}"
        class="grid-line"
      ></line>`;
    };

    const xAxisGridLinesTemplate = svg`${map(
      xValues,
      (value, i) => svg`${i > 0 && i < xValues.length - 1 ? xGridLineTemplate(value) : nothing}`,
    )}`;

    const yAxisGridLinesTemplate = svg`${map(
      yValues,
      (value, i) => svg`${i > 0 && i < yValues.length - 1 ? yGridLineTemplate(value) : nothing}`,
    )}`;

    return svg`
      <g part="grid">
        ${this.showXGrid ? svg`<g part="x-grid">${xAxisGridLinesTemplate}</g>` : nothing}
        ${this.showYGrid ? svg`<g part="y-grid">${yAxisGridLinesTemplate}</g>` : nothing}
      </g>
    `;
  }

  // TODO: We should probably refactor this so that we only calculate the font size
  // once per each unique length of strings
  private createAxisLabelsTemplate(
    xValues: ReadonlyArray<Seconds>,
    yValues: ReadonlyArray<Hertz>,
    canvasSize: Readonly<Size>,
  ) {
    const xTitleFontSize = this.calculateFontSize(this.xTitle);
    const yTitleFontSize = this.calculateFontSize(this.yTitle);
    const largestYValue = Math.max(...yValues.map(hertzToMHertz)).toFixed(1);
    const fontSize = this.calculateFontSize(largestYValue);

    const xTitleOffsetTop = xTitleFontSize.height + fontSize.height + this.tickSize.height + this.titleOffset.height;
    const yTitleOffsetLeft = yTitleFontSize.height;

    const xLabelTemplate = (value: Seconds) => {
      const xPosition = this.unitConverter?.scaleX.value(value);
      const labelYPosition = this.tickSize.height + this.labelPadding.height;

      return svg`
        <g>
          <line
            part="x-tick"
            x1="${xPosition}"
            x2="${xPosition}"
            y1="0"
            y2="${this.tickSize.height}"
          ></line>
          <text
            part="x-label"
            text-anchor="middle"
            dominant-baseline="end"
            x="${xPosition}"
            y="${labelYPosition + this.tickSize.height}"
          >
            ${value.toFixed(1)}
          </text>
      </g>
      `;
    };

    const yTitleY = canvasSize.height / 2;
    const xTitleX = canvasSize.width / 2;

    const yLabelTemplate = (value: Hertz) => {
      const xPosition = yTitleOffsetLeft + yTitleFontSize.height + this.labelPadding.width + fontSize.width;
      const yPosition = this.unitConverter?.scaleY.value(value);
      const mHertzValue = hertzToMHertz(value);

      return svg`<g>
        <line
          part="y-tick"
          x1="${xPosition}"
          x2="${xPosition + this.tickSize.width}"
          y1="${yPosition}"
          y2="${yPosition}"
        ></line>
        <text
          part="y-label"
          text-anchor="end"
          dominant-baseline="middle"
          x="${xPosition}"
          y="${yPosition}"
        >
          ${mHertzValue.toFixed(1)}
        </text>
      </g>`;
    };

    const xAxisLabelsTemplate = this.showXAxis ? svg`${map(xValues, (value) => xLabelTemplate(value))}` : nothing;
    const yAxisLabelsTemplate = this.showYAxis ? svg`${map(yValues, (value) => yLabelTemplate(value))}` : nothing;

    const xAxisTitleTemplate = this.showXTitle
      ? svg`
      <text
        part="title x-title"
        x="${xTitleX}"
        y="${xTitleOffsetTop}"
        text-anchor="middle"
        font-family="sans-serif"
      >
        ${this.xTitle}
      </text>
    `
      : nothing;

    const yAxisTitleTemplate = this.showYTitle
      ? svg`
      <text
        part="title y-title"
        x="${yTitleOffsetLeft}"
        y="${yTitleY}"
        transform="rotate(270, ${yTitleOffsetLeft}, ${yTitleY})"
        text-anchor="middle"
        font-family="sans-serif"
      >
        ${this.yTitle}
      </text>
    `
      : nothing;

    const xAxisChromeHeight = xTitleOffsetTop + xTitleFontSize.height;
    const yAxisChromeWidth =
      yTitleOffsetLeft + yTitleFontSize.height + this.labelPadding.width + fontSize.width + this.tickSize.width;

    this.xAxisTemplate = html`
      <svg class="axes-label-chrome x-axis-chrome" width="${canvasSize.width}" height="${xAxisChromeHeight}">
        <g part="x-ticks">${xAxisLabelsTemplate} ${xAxisTitleTemplate}</g>
      </svg>
    `;

    this.yAxisTemplate = html`
      <svg class="axes-label-chrome y-axis-chrome" width="${yAxisChromeWidth}" height="${canvasSize.height}">
        <g part="y-ticks">${yAxisLabelsTemplate} ${yAxisTitleTemplate}</g>
      </svg>
    `;

    return svg`
      <g part="tick">
        <g part="x-ticks">${this.xAxisTemplate}</g>
        <g part="y-ticks">${this.yAxisTemplate}</g>
      </g>
    `;
  }

  private xValues(): Seconds[] {
    if (!this.unitConverter) {
      return [];
    }

    const step =
      this.xStepOverride ??
      this.calculateStep(
        this.unitConverter.temporalDomain.value,
        this.unitConverter.temporalRange.value,
        this.unitConverter.scaleX.value,
        "width",
      );

    return this.generateAxisValues(
      this.unitConverter.renderWindow.value.startOffset,
      this.unitConverter.renderWindow.value.endOffset,
      step,
      this.unitConverter.scaleX.value,
    );
  }

  private yValues(): Hertz[] {
    if (!this.unitConverter) {
      return [];
    }

    const step =
      this.yStepOverride ??
      this.calculateStep(
        this.unitConverter.frequencyDomain.value,
        this.unitConverter.frequencyRange.value,
        this.unitConverter.scaleY.value,
        "height",
      );

    return this.generateAxisValues(
      this.unitConverter.renderWindow.value.lowFrequency,
      this.unitConverter.renderWindow.value.highFrequency,
      step,
      this.unitConverter.scaleY.value,
      false,
    );
  }

  private willFitStep(
    proposedStep: number,
    canvasSize: number,
    domain: ScaleDomain<Seconds | Hertz>,
    fontSize: number,
    scale: FrequencyScale | TemporalScale,
    melScale: boolean,
  ): boolean {
    if (!this.unitConverter) {
      console.error("Cannot calculate step without unit converter");
      return false;
    }

    const textLabelPadding = fontSize * AxesComponent.labelPadding;

    // if we are rendering in a linear scale, we can easily virtually measure
    // if the axis will fit. However, if we are using mel scale, then we have to
    // do some more complex calculations to check that the labels will fit
    if (!melScale) {
      const domainDelta = Math.abs(domain[1] - domain[0]);
      const numberOfProposedLabels = Math.ceil(domainDelta / proposedStep);

      // we double the padding because the padding is applied to both sides of
      // the label
      //
      // prettier removes the brackets because they are not need
      // however, I want to add them because it makes the code and algorithm
      // more readable
      // prettier-ignore
      const proposedSize = numberOfProposedLabels * (fontSize + (textLabelPadding * 2));
      return proposedSize < canvasSize;
    }

    // to check if the mel scale will fit, we can calculate the canvas position
    // of the last two labels and check if they overlap
    // this is because the last two labels will be the closest together and the
    // most likely to be overlapping
    const proposedValues = this.generateAxisValues(
      this.unitConverter.renderWindow.value.lowFrequency,
      this.unitConverter.renderWindow.value.highFrequency,
      proposedStep,
      scale,
      false,
    );

    const lastTwoValues = proposedValues.slice(-2);
    const lastTwoPositions = lastTwoValues.map((value) => scale(value));
    const positionDelta = Math.abs(lastTwoPositions[0] - lastTwoPositions[1]);

    // we multiple the padding by two so that the padding is virtually applied
    // to both labels in the axes
    // prettier-ignore
    return positionDelta > fontSize + (textLabelPadding * 2);
  }

  // the calculate step function will use a binary search to find the largest
  // "nice" factor that will fit the axis
  private calculateStep(
    domain: ScaleDomain<Seconds | Hertz>,
    range: ScaleRange<Seconds | Hertz>,
    scale: FrequencyScale | TemporalScale,
    sizeKey: keyof Size,
  ): number {
    if (!this.unitConverter) {
      console.error("Cannot calculate step without unit converter");
      return 0;
    }

    const niceFactors = [50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02] as const;
    const fontSize = this.calculateFontSize("0.0");
    const totalLabelSize = fontSize[sizeKey] + this.labelPadding[sizeKey];

    // the domain is the lowest and highest values that we want to show on the axis
    // meanwhile the range is the first and last position that we can position elements
    // we absolute the range to get the canvas size because for frequency the start of the range
    // is at the bottom of the canvas (since we want the lowest frequency to be at the bottom of the canvas)
    const domainDelta = domain[1] - domain[0];
    const canvasSize = Math.abs(range[1] - range[0]);

    // the domain midpoint is the value that would be at the center of the axis
    // we cannot simply do (domain[1] - domain[0]) / 2 because the we want to allow
    // for the domain minimum to be non-zero
    //
    // e.g. in the case that domain = [700, 800] we want the midpoint to be 750 not 50
    //      (in this case, 50 would be below the domain minimum of 700!)
    // prettier-ignore
    const domainMidpoint = (domainDelta / 2) + domain[0];
    const initialProposedStep = Math.pow(10, Math.floor(Math.log10(domainMidpoint)));

    for (const factor of niceFactors) {
      const proposedStep = initialProposedStep / factor;

      if (
        this.willFitStep(
          proposedStep,
          canvasSize,
          domain,
          totalLabelSize,
          scale,
          sizeKey === "height" && this.unitConverter.melScale.value,
        )
      ) {
        return proposedStep;
      }
    }

    return initialProposedStep;
  }

  private generateAxisValues(
    start: Seconds | Hertz,
    end: Seconds | Hertz,
    step: Seconds | Hertz,
    scale: FrequencyScale | TemporalScale,
    includeEnd = true,
  ): number[] {
    if (step === 0) {
      return [];
    }

    const values: number[] = [];
    for (let i = start; i < end; i += step) {
      values.push(i);
    }

    if (!includeEnd) {
      return values;
    }

    // if include end is set, we always want to show the last value in the axes
    // however, if appending the largest value would result in the labels overlapping
    // we want to remove the last "step" label and replace it with the real last value
    const lastLabel = values.at(-1) ?? 0;
    const proposedLastLabel = end;

    const lastLabelPosition = scale(lastLabel);
    const proposedLastLabelPosition = scale(proposedLastLabel);
    const proposedPositionDelta = Math.abs(lastLabelPosition - proposedLastLabelPosition);

    const fontSize = this.emUnitFontSize;
    const textLabelPadding = fontSize.width * AxesComponent.labelPadding;
    const areLastLabelsOverlapping = proposedPositionDelta < fontSize.width + textLabelPadding;
    if (areLastLabelsOverlapping && values.length > 0) {
      values.pop();
    }

    values.push(end);

    return values;
  }

  public chromeLeft(): ChromeTemplate {
    if (!this.unitConverter) {
      return nothing;
    }

    const xValues = this.xValues();
    const yValues = this.yValues();
    const canvasSize = this.unitConverter.canvasSize.value;

    this.createAxisLabelsTemplate(xValues, yValues, canvasSize);

    return this.yAxisTemplate;
  }

  public chromeBottom(): ChromeTemplate {
    if (!this.unitConverter) {
      return nothing;
    }

    const xValues = this.xValues();
    const yValues = this.yValues();
    const canvasSize = this.unitConverter.canvasSize.value;

    this.createAxisLabelsTemplate(xValues, yValues, canvasSize);

    return this.xAxisTemplate;
  }

  public chromeOverlay(): ChromeTemplate {
    if (!this.unitConverter) {
      return nothing;
    }

    const xValues = this.xValues();
    const yValues = this.yValues();
    const canvasSize = this.unitConverter.canvasSize.value;

    const gridLines = this.createGridLinesTemplate(xValues, yValues, canvasSize);

    return html`<svg class="axes-overlay-svg">${gridLines}</svg>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-axes": AxesComponent;
  }
}
