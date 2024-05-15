import { html, LitElement, svg, TemplateResult } from "lit";
import { customElement, property, queryAssignedElements, state } from "lit/decorators.js";
import { axesStyles } from "./css/style";
import { Signal, SignalWatcher } from "@lit-labs/preact-signals";
import { Spectrogram } from "../../../playwright";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { format } from "d3-format";
import { Hertz, TemporalScale, FrequencyScale, Pixel, Seconds, IScale } from "../../models/unitConverters";
import { RenderCanvasSize, RenderWindow } from "../../models/rendering";

// TODO: move this to a different place
type FormatterFunction = (n: number | { valueOf(): number }) => string;
type AxisOptions = "visible" | "hidden" | "axis" | "grid";

// TODO: move this to a different place
const booleanConverter = (value: string | null): boolean => value !== null && value !== "false";

/**
 * X and Y axis grid lines showing duration and frequency of a spectrogram
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
  public xLabel = "Time (seconds)"

  @property({ attribute: "y-label", type: String, reflect: true })
  public yLabel = "Frequency (Hertz)";

  @property({ attribute: "hide-x-axis", converter: booleanConverter })
  public showXAxis = "true";

  @property({ attribute: "y-axis", converter: booleanConverter })
  public showYAxis = "true";

  @property({ attribute: "x-grid", converter: booleanConverter })
  public showXGrid = "true";

  @property({ attribute: "y-grid", converter: booleanConverter })
  public showYGrid = "true";

  @state()
  private spectrogram!: Spectrogram;
  private scales!: Signal<IScale>;
  private renderWindow!: Signal<RenderWindow>;
  private canvasShape!: Signal<RenderCanvasSize>;

  @queryAssignedElements()
  private slotElements!: HTMLElement[];

  // TODO: We should only extract the UC out of the spectrogram element
  public handleSlotchange(): void {
    this.spectrogram = this.getSpectrogramElement();
    this.scales = this.spectrogram.unitConverters!.renderWindowScale;
    this.renderWindow = this.spectrogram.renderWindow;
    this.canvasShape = this.spectrogram.renderCanvasSize;
  }

  // TODO: I think there might be a better way to do this using a combination of
  // the queryAssignedElements() and query() decorators
  private getSpectrogramElement(): Spectrogram {
    for (const slotElement of this.slotElements) {
      if (slotElement instanceof Spectrogram) {
        return slotElement;
      }

      const queriedElement = slotElement.querySelector("oe-spectrogram");

      if (queriedElement instanceof Spectrogram) {
        return queriedElement;
      }
    }

    throw new Error("No spectrogram element found");
  }

  private createAxis(
    orientation: "x" | "y",
    values: Seconds[],
    scale: TemporalScale | FrequencyScale,
    formatter: FormatterFunction,
    label: string,
    canvasSize: Pixel,
  ) {
    const isYAxis = orientation === "y";

    const fontSize = 8; // px

    const xAxisStep = isYAxis ? 0 : 1;
    const yAxisStep = isYAxis ? 1 : 0;

    const yOffset = isYAxis ? 0 : canvasSize;

    const x = (i: number) => scale(i) * xAxisStep;
    const y = (i: number) => scale(i) * yAxisStep + yOffset;

    const labelX = isYAxis ? yOffset : canvasSize / 2;
    const labelY = isYAxis ? canvasSize / 2 : yOffset;
    const labelRotation = isYAxis ? -90 : 0;

    // const gridLine = svg`
    //   <line
    //     class="grid-line"
    //     ${orientation}1="0%"
    //     ${orientation}="50%"
    //     ${orientation}2="-100%"
    //   ></line>
    // `;

    const gridLine = svg`
      ${isYAxis
        ? svg`<line class="grid-line y-grid" part="grid y-grid" x1="0%" x2="100%"></line>`
        : svg`<line class="grid-line x-grid" part="grid x-grid" y1="0%" y2="-100%"></line>`
      }
    `;

    const tickLine = svg`
      ${isYAxis
        ? svg`<line class="axis-tick y-tick" part="tick y-tick" x1="0" x2="${-fontSize}"></line>`
        : svg`<line class="axis-tick x-tick" part="tick x-tick" y1="0" y2="${fontSize}"></line>`
      }
    `;

    const axisLegend = svg`
      <text
        class="axis-label axis-label-${orientation}"
        part="legend ${orientation}-legend"
        x="${labelX}"
        y="${labelY}"
        transform="rotate(${labelRotation}, ${labelX}, ${labelY})"
      >
        ${label}
      </text>
    `;

    return svg`
      <g>
        ${values.map((i) => svg`
          <g transform="translate(${x(i)}, ${y(i)})">
            ${gridLine}
            ${tickLine}
            <text part="label ${orientation}-label">
              ${formatter(i)}
            </text>
          </g>
        `)}
      ${axisLegend}
    </g>
  `;
  }

  private xAxis() {
    const step = this.xStepOverride || this.calculateStep(this.scales.value.temporal);

    const values = this.generateAxisValues(
      this.renderWindow.value.startOffset,
      this.renderWindow.value.endOffset,
      step,
    );

    return this.createAxis(
      "x",
      values,
      this.scales.value.temporal,
      format(".1f"),
      this.xLabel,
      this.canvasShape.value.width,
    );
  }

  private yAxis() {
    const step = this.yStepOverride || this.calculateStep(this.scales.value.frequency);

    const values = this.generateAxisValues(
      this.renderWindow.value.lowFrequency,
      this.renderWindow.value.highFrequency,
      step,
    );

    return this.createAxis(
      "y",
      values,
      this.scales.value.frequency,
      format(".0f"),
      this.yLabel,
      this.canvasShape.value.height,
    );
  }

  private calculateStep(scale: TemporalScale | FrequencyScale): number {
    const smallestValue = scale.domain()[0];
    const largestValue = scale.domain()[1];
    const midpoint = (smallestValue + largestValue) / 2;

    return Math.pow(10, Math.floor(Math.log10(midpoint)));
  }

  private generateAxisValues(
    start: Seconds | Hertz,
    end: Seconds | Hertz,
    step: Seconds | Hertz,
  ): number[] {
    const values: number[] = [];
    for (let i = start; i < end; i += step) {
      values.push(i);
    }

    values.push(end);

    return values;
  }

  public render() {
    let axes: TemplateResult<1> | undefined;

    if (this.spectrogram) {
      axes = html`
        <svg id="axes-svg">
          ${this.showXAxis && this.xAxis()}
          ${this.showYAxis && this.yAxis()}
        </svg>
      `;
    }

    return html`
      <div id="wrapped-element">
        ${axes}
        <slot @slotchange="${this.handleSlotchange}"></slot>
      </div>
    `;
  }
}
