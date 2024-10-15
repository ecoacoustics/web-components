import { html, LitElement, nothing, svg, unsafeCSS } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { SpectrogramComponent } from "spectrogram/spectrogram";
import { AbstractComponent } from "../../mixins/abstractComponent";
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
import axesStyles from "./css/style.css?inline";

// TODO: this component should have optimized rendering so that it doesn't
// attempt to re-render an axes that will result in the same template
// this is not currently the result as it will re-render the axes every time
// the spectrogram slot changes or the unit converter updates any values
// which are used in the axes rendering
// see: https://github.com/ecoacoustics/web-components/issues/85

export interface AxesOptions {
  xTitle: string;
  yTitle: string;
  showXTitle: boolean;
  showYTitle: boolean;
  showXAxis: boolean;
  showYAxis: boolean;
  showXGrid: boolean;
  showYGrid: boolean;
  xStep?: Seconds;
  yStep?: Hertz;
}

/**
 * @description
 * X and Y axis grid lines showing duration and frequency of a spectrogram
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
export class AxesComponent extends SignalWatcher(AbstractComponent(LitElement)) {
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
  private spectrogram!: SpectrogramComponent;

  @query("#axes-svg")
  private elementChrome!: Readonly<HTMLDivElement>;

  public get axesOptions(): AxesOptions {
    return {
      xStep: this.xStepOverride,
      yStep: this.yStepOverride,
      xTitle: this.xTitle,
      yTitle: this.yTitle,
      showXTitle: this.showXTitle,
      showYTitle: this.showYTitle,
      showXAxis: this.showXAxis,
      showYAxis: this.showYAxis,
      showXGrid: this.showXGrid,
      showYGrid: this.showYGrid,
    };
  }

  public set axesOptions(value: AxesOptions) {
    this.xStepOverride = value.xStep;
    this.yStepOverride = value.yStep;
    this.xTitle = value.xTitle;
    this.yTitle = value.yTitle;
    this.showXTitle = value.showXTitle;
    this.showYTitle = value.showYTitle;
    this.showXAxis = value.showXAxis;
    this.showYAxis = value.showYAxis;
    this.showXGrid = value.showXGrid;
    this.showYGrid = value.showYGrid;
  }

  // if we do not know the text that we want to measure, we use one large
  // character as an upperbound estimate of the size of characters
  // using the default case should only ever be used for estimates and measuring
  // against actual text values is recommended
  // I have this as a private property so that we don't have to re-calculate the
  // value every time we need to use it
  private emUnitFontSize!: Size;
  private unitConverter!: UnitConverter;

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

  public firstUpdated(): void {
    this.emUnitFontSize = this.calculateFontSize("M");
  }

  private handleSlotChange(): void {
    if (this.spectrogram.unitConverters) {
      this.unitConverter = this.spectrogram.unitConverters.value as UnitConverter;

      // we don't have to use a resize observer to observe when the spectrogram
      // or slotted elements resize because we will receive a signal from the
      // unit converter which will trigger a re-render
      this.unitConverter.canvasSize.subscribe((value) => this.handleCanvasResize(value));
    }
  }

  private handleCanvasResize(canvasSize: Size): void {
    if (this?.elementChrome) {
      const { width, height } = canvasSize;
      this.elementChrome.style.width = `${width}px`;
      this.elementChrome.style.height = `${height}px`;
    }
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

  private createGridLinesTemplate(xValues: Seconds[], yValues: Hertz[], canvasSize: Size) {
    const xGridLineTemplate = (value: Seconds) => {
      // we pull out xPosition to a variable because we use it twice (without modification)
      // for the lines x1 and x2 position
      // by pulling it out to a separate variable, we can avoid recalculating the value twice
      const xPosition = this.unitConverter.scaleX.value(value);
      return svg`<line
        x1="${xPosition}"
        x2="${xPosition}"
        y1="0"
        y2="${canvasSize.height}"
        class="grid-line"
      ></line>`;
    };

    const yGridLineTemplate = (value: Hertz) => {
      const yPosition = this.unitConverter.scaleY.value(value);
      return svg`<line
        x1="0"
        x2="${canvasSize.width}"
        y1="${yPosition}"
        y2="${yPosition}"
        class="grid-line"
      ></line>`;
    };

    const xAxisGridLinesTemplate = svg`${xValues.map(
      (value, i) => svg`${i > 0 && i < xValues.length - 1 ? xGridLineTemplate(value) : nothing}`,
    )}`;

    const yAxisGridLinesTemplate = svg`${yValues.map(
      (value, i) => svg`${i > 0 && i < yValues.length - 1 ? yGridLineTemplate(value) : nothing}`,
    )}`;

    return svg`
      <g part="grid" >
        ${this.showXGrid ? svg`<g part="x-grid">${xAxisGridLinesTemplate}</g>` : nothing}
        ${this.showYGrid ? svg`<g part="y-grid">${yAxisGridLinesTemplate}</g>` : nothing}
      </g>
    `;
  }

  // TODO: We should probably refactor this so that we only calculate the font size
  // once per each unique length of strings
  private createAxisLabelsTemplate(xValues: Seconds[], yValues: Hertz[], canvasSize: Size) {
    const xTitleFontSize = this.calculateFontSize(this.xTitle);
    const yTitleFontSize = this.calculateFontSize(this.yTitle);
    const largestYValue = Math.max(...yValues.map(hertzToMHertz)).toFixed(1);
    const fontSize = this.calculateFontSize(largestYValue);

    // Because the y-axis labels can be a variable length, we can't just offset the y-axis title by a fixed amount
    // This is unlike the x-axis where the font will always have the same height, regardless of how many digits
    // Therefore, we have to get the number of digits in the largest number in the y-axis, then position the y-axis
    // label assuming at a fixed amount away from the largest theoretical axis label
    const xTitleOffset = xTitleFontSize.height + fontSize.height + this.tickSize.height + this.titleOffset.height;
    const yTitleOffset = yTitleFontSize.height + fontSize.width;

    if (this.elementChrome) {
      const xAxisPadding = xTitleOffset + xTitleFontSize.height;
      const yAxisPadding = yTitleOffset;
      this.elementChrome.style.setProperty("--x-axis-padding", `${xAxisPadding}px`);
      this.elementChrome.style.setProperty("--y-axis-padding", `${yAxisPadding}px`);
    }

    const xLabelTemplate = (value: Seconds) => {
      const xPosition = this.unitConverter.scaleX.value(value);
      const labelYPosition = canvasSize.height + this.tickSize.height;
      const tickYPosition = canvasSize.height;

      return svg`
        <g>
          <line
            part="x-tick"
            x="${xPosition}"
            y1="${tickYPosition}"
            y2="${tickYPosition + this.tickSize.height}"
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

    const yLabelTemplate = (value: Hertz) => {
      const xPosition = -this.tickSize;
      const yPosition = this.unitConverter.scaleY.value(value);
      const mHertzValue = hertzToMHertz(value);

      return svg`<g>
        <line
          part="y-tick"
          x1="${xPosition}"
          x2="${xPosition + this.tickSize.width}"
          y="${yPosition}"
        ></line>
        <text
          part="y-label"
          text-anchor="end"
          dominant-baseline="middle"
          x="${xPosition - this.labelPadding.width}"
          y="${yPosition}"
        >
          ${mHertzValue.toFixed(1)}
        </text>
      </g>`;
    };

    const xAxisLabelsTemplate = this.showXAxis ? svg`${xValues.map((value) => xLabelTemplate(value))}` : nothing;
    const yAxisLabelsTemplate = this.showYAxis ? svg`${yValues.map((value) => yLabelTemplate(value))}` : nothing;

    const xAxisTitleTemplate = this.showXTitle
      ? svg`
      <text
        part="title x-title"
        x="${canvasSize.width / 2}"
        y="${canvasSize.height + xTitleOffset}"
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
        x="-${yTitleOffset}"
        y="${canvasSize.height / 2}"
        transform="rotate(270, -${yTitleOffset}, ${canvasSize.height / 2})"
        text-anchor="middle"
        font-family="sans-serif"
      >
        ${this.yTitle}
      </text>
    `
      : nothing;

    return svg`
      <g part="tick">
        <g part="x-ticks">
          ${xAxisLabelsTemplate}
          ${xAxisTitleTemplate}
        </g>

        <g part="y-ticks">
          ${yAxisLabelsTemplate}
          ${yAxisTitleTemplate}
        </g>
      </g>
    `;
  }

  private xValues(): Seconds[] {
    const step =
      this.xStepOverride ||
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
    const step =
      this.yStepOverride ||
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
    const proposedValues = this.generateAxisValues(domain[0], domain[1], proposedStep, scale, false);
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
    const niceFactors = [50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02];
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
          sizeKey === "height" ? this.unitConverter.melScale.value : false,
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

  private axesTemplate() {
    const xValues = this.xValues();
    const yValues = this.yValues();
    const canvasSize = this.unitConverter.canvasSize.value;

    const gridLines = this.createGridLinesTemplate(xValues, yValues, canvasSize);
    const labels = this.createAxisLabelsTemplate(xValues, yValues, canvasSize);

    return html`<svg id="axes-svg">${gridLines} ${labels}</svg>`;
  }

  public render() {
    return html`
      ${this.unitConverter ? this.axesTemplate() : nothing}
      <slot @slotchange="${this.handleSlotChange}"></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-axes": AxesComponent;
  }
}
