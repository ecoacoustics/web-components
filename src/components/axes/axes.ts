import { html, LitElement, nothing, svg } from "lit";
import { customElement, property } from "lit/decorators.js";
import { axesStyles } from "./css/style";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { Spectrogram } from "../../../playwright";
import { AbstractComponent } from "../../mixins/abstractComponent";
import {
  Hertz,
  TemporalScale,
  FrequencyScale,
  Seconds,
  UnitConverter,
  Pixel,
  ScaleDomain,
  ScaleRange,
} from "../../models/unitConverters";
import { booleanConverter } from "../../helpers/attributes";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { Size } from "../../models/rendering";
import { theming } from "../../helpers/themes/theming";

/**
 * X and Y axis grid lines showing duration and frequency of a spectrogram
 *
 * @example
 * ```html
 * <oe-axes x-axis y-axis="false">
 *     <oe-spectrogram src="/example.flac"></oe-spectrogram>
 * </oe-axes>
 * ```
 *
 * @property x-step - The step size for the x-axis
 * @property y-step - The step size for the y-axis
 * @property x-axis - Whether to show or hide the x-axis
 * @property y-axis - Whether to show or hide the x-axis
 * @property x-grid - Whether to show or hide the x-axis grid lines
 * @property y-grid - Whether to show or hide the y-axis grid lines
 * @property x-label - Whether to show or hide the x-axis labels
 * @property y-label - Whether to show or hide the y-axis labels
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
export class Axes extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = [theming, axesStyles];

  @property({ attribute: "x-step", type: Number, reflect: true })
  public xStepOverride: Seconds | undefined;

  @property({ attribute: "y-step", type: Number, reflect: true })
  public yStepOverride: Hertz | undefined;

  @property({ attribute: "x-label", type: String, reflect: true })
  public xLabel = "Time (Seconds)";

  @property({ attribute: "y-label", type: String, reflect: true })
  public yLabel = "Frequency (KHz)";

  @property({ attribute: "x-title", converter: booleanConverter })
  public showXTitle = true;

  @property({ attribute: "y-title", converter: booleanConverter })
  public showYTitle = true;

  @property({ attribute: "x-axis", converter: booleanConverter })
  public showXAxis = true;

  @property({ attribute: "y-axis", converter: booleanConverter })
  public showYAxis = true;

  @property({ attribute: "x-grid", converter: booleanConverter })
  public showXGrid = true;

  @property({ attribute: "y-grid", converter: booleanConverter })
  public showYGrid = true;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram!: Spectrogram;

  private unitConverter!: UnitConverter;

  // label padding is the minimum additional distance between the labels
  // while the titleOffset is the distance between the axis title and the axis labels
  private labelPadding: Pixel = 8;
  private tickSize: Pixel = 8;
  private titleOffset: Pixel = 4;

  private handleSlotchange(): void {
    this.unitConverter = this.spectrogram.unitConverters!;
  }

  // because querying the DOM for the font size will cause a repaint and reflow
  // we calculate the value once using a canvas
  private calculateFontSize(text = "M"): Size {
    const element = document.createElement("canvas");
    const context = element.getContext("2d")!;
    context.font = "var(--oe-font-size) var(--oe-font-family)";

    const measurements = context.measureText(text);
    const width = measurements.width;
    const height = measurements.actualBoundingBoxAscent + measurements.actualBoundingBoxDescent;

    return { width, height };
  }

  private createGridLines(xValues: Seconds[], yValues: Hertz[], canvasSize: Size) {
    // we don't want to show the first and last grid lines because it would
    // draw a border around the element
    const shouldShowGridLine = (i: number, values: any[]) => i > 0 && i < values.length - 1;

    const xGridLine = (value: Seconds) => {
      // we pull out xPos to a variable because we use it twice (without modification)
      // for the lines x1 and x2 position
      // by pulling it out to a separate variable, we can avoid recalculating the value twice
      const xPos = this.unitConverter.scaleX.value(value);
      return svg`<line
        x1="${xPos}"
        x2="${xPos}"
        y1="0"
        y2="${canvasSize.height}"
        class="grid-line"
      ></line>`;
    };

    const yGridLine = (value: Hertz) => {
      const yPos = this.unitConverter.scaleY.value(value);
      return svg`<line
        x1="0"
        x2="${canvasSize.width}"
        y1="${yPos}"
        y2="${yPos}"
        class="grid-line"
      ></line>`;
    };

    const xAxisGridLines = svg`${xValues.map(
      (value, i) => svg`${shouldShowGridLine(i, xValues) && xGridLine(value)}`,
    )}`;

    const yAxisGridLines = svg`${yValues.map(
      (value, i) => svg`${shouldShowGridLine(i, yValues) && yGridLine(value)}`,
    )}`;

    return svg`
      <g part="grid">
        ${this.showXGrid ? svg`<g part="x-grid">${xAxisGridLines}</g>` : ``}
        ${this.showYGrid ? svg`<g part="y-grid">${yAxisGridLines}</g>` : ``}
      </g>
    `;
  }

  // TODO: We should probably refactor this so that we only calculate the font size
  // once per each unique length of strings
  private createAxisLabels(xValues: Seconds[], yValues: Hertz[], canvasSize: Size) {
    const xTitleFontSize = this.calculateFontSize(this.xLabel);
    const yTitleFontSize = this.calculateFontSize(this.yLabel);
    const largestYValue = Math.max(...yValues.map((x) => x / 1000)).toFixed(1);
    const fontSize = this.calculateFontSize(largestYValue);

    // Because the y-axis labels can be a variable length, we can't just offset the y-axis title by a fixed amount
    // This is unlike the x-axis where the font will always have the same height, regardless of how many digits
    // Therefore, we have to get the number of digits in the largest number in the y-axis, then position the y-axis
    // label assuming at a fixed amount away from the largest theoretical axis label
    const xTitleOffset = xTitleFontSize.height + fontSize.height + this.tickSize + this.titleOffset;
    const yTitleOffset = yTitleFontSize.height + fontSize.width + this.tickSize;

    const xLabel = (value: Seconds) => {
      const xPos = this.unitConverter.scaleX.value(value);
      const yPos = canvasSize.height + this.tickSize;

      return svg`<g>
        <line
          x1="${this.unitConverter.scaleX.value(value)}"
          x2="${this.unitConverter.scaleX.value(value)}"
          y1="${canvasSize.height}"
          y2="${canvasSize.height + this.tickSize}"
        ></line>
        <text
          part="label x-label"
          text-anchor="middle"
          dominant-baseline="end"
          x="${xPos}"
          y="${yPos + this.tickSize}"
        >
          ${value.toFixed(1)}
        </text>
      </g>`;
    };

    const yLabel = (value: Hertz) => {
      const xPos = -this.tickSize;
      const yPos = this.unitConverter.scaleY.value(value);

      return svg`<g>
        <line
          x1="${xPos}"
          x2="${xPos + this.tickSize}"
          y1="${this.unitConverter.scaleY.value(value)}"
          y2="${this.unitConverter.scaleY.value(value)}"
        ></line>
        <text
          part="label y-label"
          text-anchor="end"
          dominant-baseline="middle"
          x="${xPos - this.labelPadding}"
          y="${yPos}"
        >
          ${(value / 1_000).toFixed(1)}
        </text>
      </g>`;
    };

    const xAxisLabels = this.showXAxis ? svg`${xValues.map((value) => xLabel(value))}` : nothing;
    const yAxisLabels = this.showYAxis ? svg`${yValues.map((value) => yLabel(value))}` : nothing;

    const xAxisTitle = this.showXTitle
      ? svg`
      <text
        part="title x-title"
        x="${canvasSize.width / 2}"
        y="${canvasSize.height + xTitleOffset}"
        text-anchor="middle"
        font-family="sans-serif"
      >
        ${this.xLabel}
      </text>
    `
      : nothing;

    const yAxisTitle = this.showYTitle
      ? svg`
      <text
        part="title y-title"
        x="-${yTitleOffset}"
        y="${canvasSize.height / 2}"
        transform="rotate(270, -${yTitleOffset}, ${canvasSize.height / 2})"
        text-anchor="middle"
        font-family="sans-serif"
      >
        ${this.yLabel}
      </text>
    `
      : nothing;

    return svg`
      <g part="tick">
        <g part="x-tick">
          ${xAxisLabels}
          ${xAxisTitle}
        </g>

        <g part="y-tick">
          ${yAxisLabels}
          ${yAxisTitle}
        </g>
      </g>
    `;
  }

  private createAxes() {
    const xValues = this.xValues();
    const yValues = this.yValues();
    const canvasSize = this.unitConverter.canvasSize.value;

    const gridLines = this.createGridLines(xValues, yValues, canvasSize);
    const labels = this.createAxisLabels(xValues, yValues, canvasSize);

    return html`<svg>${gridLines} ${labels}</svg>`;
  }

  private xValues(): Seconds[] {
    const step =
      this.xStepOverride ||
      this.calculateStep(this.unitConverter.temporalDomain.value, this.unitConverter.temporalRange.value, "width");

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
      this.calculateStep(this.unitConverter.frequencyDomain.value, this.unitConverter.frequencyRange.value, "height");

    return this.generateAxisValues(
      this.unitConverter.renderWindow.value.lowFrequency,
      this.unitConverter.renderWindow.value.highFrequency,
      step,
      this.unitConverter.scaleY.value,
      false,
    );
  }

  private willFitStep(proposedStep: number, canvasSize: number, domainDelta: number, fontSize: number): boolean {
    const numberOfProposedLabels = Math.ceil(domainDelta / proposedStep);
    const proposedSize = numberOfProposedLabels * fontSize;
    return proposedSize < canvasSize;
  }

  private calculateStep(
    domain: ScaleDomain<Seconds | Hertz>,
    range: ScaleRange<Seconds | Hertz>,
    sizeKey: keyof Size,
  ): number {
    const niceFactors = [10, 5, 2, 1, 0.5, 0.2, 0.1];
    const fontSize = this.calculateFontSize("0.0");
    const totalLabelSize = fontSize[sizeKey] + this.labelPadding;

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

      if (this.willFitStep(proposedStep, canvasSize, domainDelta, totalLabelSize)) {
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
    const lastLabel = values.at(-1)!;
    const proposedLastLabel = end;

    const lastLabelPosition = scale(lastLabel);
    const proposedLastLabelPosition = scale(proposedLastLabel);
    const proposedPositionDelta = Math.abs(lastLabelPosition - proposedLastLabelPosition);

    const fontSize = this.calculateFontSize();
    const areLastLabelsOverlapping = proposedPositionDelta < fontSize.width + this.labelPadding;
    if (areLastLabelsOverlapping) {
      values.pop();
    }

    values.push(end);

    return values;
  }

  public render() {
    return html`
      <div id="wrapped-element">
        ${this.unitConverter && this.createAxes()}
        <slot @slotchange="${this.handleSlotchange}"></slot>
      </div>
    `;
  }

  // TODO: the canvas that we use to calculate the font width/height should be
  // cached as a static field
  public static fontCanvas: HTMLCanvasElement = document.createElement("canvas");
}
