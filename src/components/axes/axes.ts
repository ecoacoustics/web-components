import { html, LitElement, svg } from "lit";
import { customElement, property, query, queryAssignedElements } from "lit/decorators.js";
import { axesStyles } from "./css/style";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { RenderWindow } from "../models/rendering";
import { Spectrogram } from "../../../playwright";
import * as d3Axis from "d3-axis";

/**
 * @slot - A spectrogram element to add axes to
 */
@customElement("oe-axes")
export class Axes extends SignalWatcher(LitElement) {
  public constructor() {
    super();
  }

  public static styles = axesStyles;

  @property({ attribute: "x-step", type: Number })
  public xStep: number = 1; // second

  @property({ attribute: "y-step", type: Number })
  public yStep: number = 1_000; // hertz

  @property({ attribute: "x-axis", type: Boolean, reflect: true })
  public showXAxis: boolean = true;

  @property({ attribute: "y-axis", type: Boolean, reflect: true })
  public showYAxis: boolean = true;

  @property({ attribute: "x-grid", type: Boolean, reflect: true })
  public showXGrid: boolean = true;

  @property({ attribute: "y-grid", type: Boolean, reflect: true })
  public showYGrid: boolean = true;

  @queryAssignedElements()
  private slotElements!: Array<Spectrogram>;

  @query("#xaxis-svg")
  private xAxisSvg!: SVGElement;

  @query("#yaxis-svg")
  private yAxisSvg!: SVGElement;

  private spectrogramElement(): Spectrogram {
    return this.slotElements[0];
  }

  private renderWindow(): RenderWindow | null {
    const spectrogramElement = this.spectrogramElement();
    return spectrogramElement?.renderWindow?.value;
  }

  private axesSeconds(): number {}

  private axesPx(): number {}

  private axesFraction(num: number): number {}

  private xAxis(): number[][] {
    const renderWindow = this.renderWindow();

    if (!renderWindow) return [];

    const x0 = renderWindow.startOffset;
    const xn = renderWindow.endOffset;

    const xDelta = xn - x0;
    const step = this.xStep;

    // TODO: we need to make sure that the last tick is always emitted
    const result = [];
    for (let i = 0; i < xn; i += step) {
      const fractionalValue = this.spectrogramElement()?.segmentToFractionalScale.value.temporal(i);
      const canvasValue = this.spectrogramElement()?.segmentToCanvasScale.value.temporal(i);
      const time = i;
      result.push([time, canvasValue, fractionalValue]);
    }

    const fractionalValue = this.spectrogramElement()?.segmentToFractionalScale.value.temporal(xn);
    const canvasValue = this.spectrogramElement()?.segmentToCanvasScale.value.temporal(xn);
    const time = xn;
    result.push([time, canvasValue, fractionalValue]);

    const axis = d3Axis.axisBottom(this.spectrogramElement()?.segmentToCanvasScale.value.temporal);

    this.xAxisSvg.append("g").call(axis);

    return result;
  }

  private yAxis(): number[][] {
    const renderWindow = this.renderWindow();

    if (!renderWindow) return [];

    const y0 = renderWindow.lowFrequency;
    const yn = renderWindow.highFrequency;

    const step = this.yStep;

    const result = [];
    for (let i = 0; i < yn; i += step) {
      const fractionalValue = this.spectrogramElement()?.segmentToFractionalScale.value.frequency(i);
      const canvasValue = this.spectrogramElement()?.segmentToCanvasScale.value.frequency(i);
      const hertz = i;
      result.push([hertz, canvasValue, fractionalValue]);
    }

    const fractionalValue = this.spectrogramElement()?.segmentToFractionalScale.value.frequency(yn);
    const canvasValue = this.spectrogramElement()?.segmentToCanvasScale.value.frequency(yn);
    const hertz = yn;
    result.push([hertz, canvasValue, fractionalValue]);

    return result;
  }

  public render() {
    return html`
      <div id="axes-container">
        <div id="wrapped-element">
          <slot @slotchange="${() => this.requestUpdate()}"></slot>
        </div>

        <svg id="xaxis-svg"></svg>

        <svg id="yaxis-svg"></svg>

        <ol id="x-axis" class="axis">
          x ${this.xAxis().map((i) => html`<li>${i[0]}s,${i[1]}px,${i[2]}</li>`)}
        </ol>

        <ol id="y-axis" class="axis">
          y
          ${this.yAxis()
            .reverse()
            .map((i) => html`<li>${i[0]}hz,${i[1]}px,${i[2]}</li>`)}
        </ol>
      </div>
    `;
  }
}
