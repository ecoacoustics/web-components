import { html, LitElement, svg } from "lit";
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
  IScale,
  Pixel,
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
  private labelPadding: Pixel = 4;
  private tickSize: Pixel = 8;
  private titleOffset: Pixel = 6;

  private handleSlotchange(): void {
    this.unitConverter = this.spectrogram.unitConverters!;
  }

  // because querying the DOM for the font size will cause a repaint and reflow
  // we calculate the value once using a canvas
  private calculateFontSize(text = "0"): Size {
    const element = document.createElement("canvas");
    const context = element.getContext("2d")!;
    context.font = "16px sans-serif";

    const metrics = context.measureText(text);
    const width = metrics.width;
    const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    return { width, height };
  }

  private createGridLines(xValues: Seconds[], yValues: Hertz[], scale: IScale, canvasSize: Size) {
    // we don't want to show the first and last grid lines because it would
    // draw a border around the element
    const shouldShowGridLine = (i: number, values: any[]) => i > 0 && i < values.length - 1;

    // TODO: don't recompute the x position twice
    const xGridLine = (value: Seconds) =>
      svg`<line
        x1="${scale.temporal(value)}"
        x2="${scale.temporal(value)}"
        y1="0"
        y2="${canvasSize.height}"
        class="grid-line"
      ></line>`;

    const yGridLine = (value: Hertz) =>
      svg`<line
        x1="0"
        x2="${canvasSize.width}"
        y1="${scale.frequency(value)}"
        y2="${scale.frequency(value)}"
        class="grid-line"
      ></line>`;

    const xAxisGridLines = svg`${xValues.map(
      (value, i) => svg`${shouldShowGridLine(i, xValues) && xGridLine(value)}`,
    )}`;

    const yAxisGridLines = svg`${yValues.map(
      (value, i) => svg`${shouldShowGridLine(i, yValues) && yGridLine(value)}`,
    )}`;

    return svg`
      <g part="grid">
        <g part="x-grid">${xAxisGridLines}</g>
        <g part="y-grid">${yAxisGridLines}<g>
      </g>
    `;
  }

  private createAxisLabels(xValues: Seconds[], yValues: Hertz[], scale: IScale, canvasSize: Size) {
    const xTitleFontSize = this.calculateFontSize(this.xLabel);
    // const yTitleFontSize = this.calculateFontSize(this.yLabel);
    const largestYValue = Math.max(...yValues.map((x) => x / 1000)).toFixed(1);
    const fontSize = this.calculateFontSize(largestYValue);

    // Because the y-axis labels can be a variable length, we can't just offset the y-axis title by a fixed amount
    // This is unlike the x-axis where the font will always have the same height, regardless of how many digits
    // Therefore, we have to get the number of digits in the largest number in the y-axis, then position the y-axis
    // label assuming at a fixed amount away from the largest theoretical axis label
    // TODO: We could probably do this more clever with an intersection observer or measuring the width of the proposed
    //       label, and get the number of digits that the proposed title will have to clear
    const xTitleOffset = xTitleFontSize.height + this.tickSize + this.titleOffset + this.labelPadding;
    const yTitleOffset = fontSize.width + this.tickSize + this.titleOffset + this.labelPadding;

    const xLabel = (value: Seconds) => {
      const labelSize = this.calculateFontSize(value.toFixed(1));
      const xPos = scale.temporal(value) + labelSize.width / 2;
      const yPos = canvasSize.height + this.labelPadding + this.tickSize;

      return svg`<g>
        <line
          x1="${scale.temporal(value)}"
          x2="${scale.temporal(value)}"
          y1="${canvasSize.height}"
          y2="${canvasSize.height + this.tickSize}"
        ></line>
        <text
          part="label x-label"
          text-anchor="end"
          x="${xPos}"
          y="${yPos + this.labelPadding}"
        >
          ${value.toFixed(1)}
        </text>
      </g>`;
    };

    const yLabel = (value: Hertz) => {
      const labelSize = this.calculateFontSize(value.toString());
      const xPos = -this.tickSize;
      const yPos = scale.frequency(value) + labelSize.height / 2;

      return svg`<g>
        <line
          x1="${xPos}"
          x2="${xPos + this.tickSize}"
          y1="${scale.frequency(value)}"
          y2="${scale.frequency(value)}"
        ></line>
        <text
          part="label y-label"
          text-anchor="end"
          x="${xPos - this.labelPadding}"
          y="${yPos}"
        >
          ${(value / 1_000).toFixed(1)}
        </text>
      </g>`;
    };

    const xAxisLabels = svg`${xValues.map((value) => xLabel(value))}`;
    const yAxisLabels = svg`${yValues.map((value) => yLabel(value))}`;

    const xAxisTitle = svg`
      <text
        part="title x-title"
        x="${canvasSize.width / 2}"
        y="${canvasSize.height + xTitleOffset}"
        text-anchor="middle"
        font-family="sans-serif"
      >
        ${this.xLabel}
      </text>
    `;

    const yAxisTitle = svg`
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
    `;

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
    const scale = this.unitConverter.renderWindowScale.value;
    const canvasSize = this.unitConverter.canvasSize.value;

    const gridLines = this.createGridLines(xValues, yValues, scale, canvasSize);
    const labels = this.createAxisLabels(xValues, yValues, scale, canvasSize);

    return html`<svg>${gridLines} ${labels}</svg>`;
  }

  private xValues(): Seconds[] {
    const step = this.xStepOverride || this.calculateStep(this.unitConverter.renderWindowScale.value.temporal);

    return this.generateAxisValues(
      this.unitConverter.renderWindow.value.startOffset,
      this.unitConverter.renderWindow.value.endOffset,
      step,
      this.unitConverter.renderWindowScale.value.temporal,
    );
  }

  private yValues(): Hertz[] {
    const step = this.yStepOverride || this.calculateStep(this.unitConverter.renderWindowScale.value.frequency);

    return this.generateAxisValues(
      this.unitConverter.renderWindow.value.lowFrequency,
      this.unitConverter.renderWindow.value.highFrequency,
      step,
      this.unitConverter.renderWindowScale.value.frequency,
      false,
    );
  }

  private calculateStep(scale: TemporalScale | FrequencyScale): number {
    const smallestValue = scale.domain()[0];
    const largestValue = scale.domain()[1];
    const valueDelta = largestValue - smallestValue;

    const canvasSize = Math.abs(scale.range()[1] - scale.range()[0]);

    const midpoint = (smallestValue + largestValue) / 2;

    const baseTenStep = Math.pow(10, Math.floor(Math.log10(midpoint)));

    // we try to divide the base ten step by some nice factors and see if they still fit
    // if they do, we should use them instead
    // higher in the list takes higher priority
    const niceFactors = [5, 2];
    const fontSize = this.calculateFontSize();
    const totalLabelSize = fontSize.width * (this.labelPadding * 2);

    for (const factor of niceFactors) {
      const proposedStep = baseTenStep / factor;

      // the total label size includes the labels font size and the padding at
      // the start and end (which is why we multiply this.fontPadding by two)
      const numberOfLabels = Math.ceil(valueDelta / proposedStep);
      const proposedSize = numberOfLabels * totalLabelSize;

      const willFitStep = proposedSize < canvasSize;

      if (willFitStep) {
        return proposedStep;
      }
    }

    return baseTenStep;
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
}
