import { html, LitElement, svg, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { axesStyles } from "./css/style";
import { Signal, SignalWatcher } from "@lit-labs/preact-signals";
import { Spectrogram } from "../../../playwright";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { Hertz, TemporalScale, FrequencyScale, Pixel, Seconds, UnitConverter } from "../../models/unitConverters";
import { RenderCanvasSize, RenderWindow } from "../../models/rendering";
import { booleanConverter } from "../../helpers/attributes";
import { queryDeeplyAssignedElements } from "../../helpers/decorators";

type Orientation = "x" | "y";

type Orientation = "x" | "y";

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
  public static styles = axesStyles;

  @property({ attribute: "x-step", type: Number, reflect: true })
  public xStepOverride: Seconds | undefined;

  @property({ attribute: "y-step", type: Number, reflect: true })
  public yStepOverride: Hertz | undefined;

  @property({ attribute: "x-label", type: String, reflect: true })
  public xLabel = "Time (seconds)";

  @property({ attribute: "y-label", type: String, reflect: true })
  public yLabel = "Frequency (Hertz)";

  @property({ attribute: "x-axis", converter: booleanConverter })
  public showXAxis = true;

  @property({ attribute: "y-axis", converter: booleanConverter })
  public showYAxis = true;

  @property({ attribute: "x-grid", converter: booleanConverter })
  public showXGrid = true;

  @property({ attribute: "y-grid", converter: booleanConverter })
  public showYGrid = true;

  @queryDeeplyAssignedElements({ selector: "oe-spectrogram" })
  private spectrogram!: Spectrogram;

  private renderWindow!: Signal<RenderWindow>;
  private canvasShape!: Signal<RenderCanvasSize>;

  private unitConverter!: UnitConverter;

  // font size is the size of the font
  // while label padding is the minimum additional distance between the labels
  // while the labelOffset is the distance between the label and the edge of the canvas
  private fontSize = 8; // px
  private labelPadding = 3; // px
  private labelOffset = this.fontSize;

  // TODO: We should only extract the UC out of the spectrogram element
  private handleSlotchange(): void {
    this.unitConverter = this.spectrogram.unitConverters!;

    this.renderWindow = this.spectrogram.renderWindow;
    this.canvasShape = this.spectrogram.renderCanvasSize;
  }

  private createAxis(
    orientation: Orientation,
    values: Seconds[],
    scale: TemporalScale | FrequencyScale,
    formatter: (value: number) => string,
    label: string,
    canvasSize: Pixel,
  ) {
    const isYAxis = orientation === "y";

    const xAxisStep = isYAxis ? 0 : 1;
    const yAxisStep = isYAxis ? 1 : 0;

    const yOffset = isYAxis ? 0 : canvasSize;

    const x = (i: number) => scale(i) * xAxisStep;
    const y = (i: number) => scale(i) * yAxisStep + yOffset;

    const labelX = isYAxis ? -(this.fontSize * 7) : canvasSize / 2;
    const labelY = isYAxis ? canvasSize / 2 : canvasSize + this.fontSize * 5;

    const labelRotation = isYAxis ? 90 : 0;

    // const gridLine = svg`
    //   <line
    //     class="grid-line"
    //     ${orientation}1="0%"
    //     ${orientation}="50%"
    //     ${orientation}2="-100%"
    //   ></line>
    // `;

    const gridLine = svg`
      ${
        isYAxis
          ? svg`<line class="grid-line y-grid" part="grid y-grid" x1="0%" x2="100%"></line>`
          : svg`<line class="grid-line x-grid" part="grid x-grid" y1="0%" y2="-100%"></line>`
      }
    `;

    const tickLine = svg`
      ${
        isYAxis
          ? svg`<line class="axis-tick y-tick" part="tick y-tick" x1="0" x2="${-this.fontSize}"></line>`
          : svg`<line class="axis-tick x-tick" part="tick x-tick" y1="0" y2="${this.fontSize}"></line>`
      }
    `;

    const axisTitle = svg`
      <text
        class="axis-label axis-label-${orientation}"
        part="legend ${orientation}-legend"
        x="${isYAxis ? labelX : "50%"}"
        y="${isYAxis ? "50%" : labelY}"
        text-anchor="middle"
        transform="rotate(${labelRotation}, ${labelX}, ${labelY})"
        font-family="sans-serif"
      >
        ${label}
      </text>
    `;

    // we do not want to show grid lines on the first and last label
    // otherwise, there will be a border around the element
    const shouldShowGridLine = (i: number) => i > 0 && i < values.length - 1;

    return svg`
      <g>
        ${values.map(
          (value, i) => svg`
          <g transform="translate(${x(value)}, ${y(value)})">
            ${shouldShowGridLine(i) && gridLine}
            ${tickLine}
            <text
              text-anchor="end"
              font-family="sans-serif"
              part="label ${orientation}-label"
              transform="translate(0, ${this.fontSize + this.labelOffset})"
            >
              ${formatter(value)}
            </text>
          </g>
        `,
        )}
      ${axisTitle}
    </g>
  `;
  }

  private xAxis() {
    const step = this.xStepOverride || this.calculateStep(this.unitConverter.renderWindowScale.value.temporal);

    const values = this.generateAxisValues(
      this.renderWindow.value.startOffset,
      this.renderWindow.value.endOffset,
      step,
      this.unitConverter.renderWindowScale.value.temporal,
    );

    return this.createAxis(
      "x",
      values,
      this.unitConverter.renderWindowScale.value.temporal,
      (x) => x.toFixed(1),
      this.xLabel,
      // TODO: This is incorrect, but it works for the demo
      this.canvasShape.value.height,
    );
  }

  private yAxis() {
    const step = this.yStepOverride || this.calculateStep(this.unitConverter.renderWindowScale.value.frequency);

    const values = this.generateAxisValues(
      this.renderWindow.value.lowFrequency,
      this.renderWindow.value.highFrequency,
      step,
      this.unitConverter.renderWindowScale.value.frequency,
    );

    return this.createAxis(
      "y",
      values,
      this.unitConverter.renderWindowScale.value.frequency,
      (x) => x.toFixed(0),
      this.yLabel,
      this.canvasShape.value.height,
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
    const totalLabelSize = this.fontSize * (this.labelPadding * 2);

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
  ): number[] {
    const values: number[] = [];
    for (let i = start; i < end; i += step) {
      values.push(i);
    }

    // we always want to show the last value in the axes
    // however, if appending the largest value would result in the labels overlapping
    // we want to remove the last "step" label and replace it with the real last value
    const lastLabel = values.at(-1)!;
    const proposedLastLabel = end;

    const lastLabelPosition = scale(lastLabel);
    const proposedLastLabelPosition = scale(proposedLastLabel);
    const proposedPositionDelta = Math.abs(lastLabelPosition - proposedLastLabelPosition);

    const areLastLabelsOverlapping = proposedPositionDelta < this.fontSize + this.labelPadding;
    if (areLastLabelsOverlapping) {
      values.pop();
    }

    values.push(end);

    return values;
  }

  private generateAxisValues(start: Seconds | Hertz, end: Seconds | Hertz, step: Seconds | Hertz): number[] {
    const values: number[] = [];
    for (let i = start; i < end; i += step) {
      values.push(i);
    }

    // we always want to show the last value in the axes
    // however, if appending the largest value would result in the labels overlapping
    // we want to remove the last "step" label and replace it with the real last value
    const lastLabel = values.at(-1)!;
    const proposedLastLabel = end;

    const lastLabelPosition = scale(lastLabel);
    const proposedLastLabelPosition = scale(proposedLastLabel);
    const proposedPositionDelta = Math.abs(lastLabelPosition - proposedLastLabelPosition);

    const areLabelsOverlapping = proposedPositionDelta < this.fontSize + this.labelPadding;
    if (areLabelsOverlapping) {
      values.pop();
    }

    values.push(end);

    return values;
  }

  public render() {
    let axes: TemplateResult<1> | undefined;

    if (this.spectrogram) {
      axes = html`<svg id="axes-svg">${this.showXAxis && this.xAxis()} ${this.showYAxis && this.yAxis()}</svg>`;
    }

    return html`
      <div id="wrapped-element">
        ${axes}
        <slot @slotchange="${this.handleSlotchange}"></slot>
      </div>
    `;
  }
}
