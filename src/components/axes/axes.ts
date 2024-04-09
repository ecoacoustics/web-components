import { html, LitElement } from "lit";
import { customElement, property, query, queryAssignedElements } from "lit/decorators.js";
import { axesStyles } from "./css/style";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { RenderWindow } from "../models/rendering";
import { Spectrogram } from "../../../playwright";
import * as d3 from "d3";
import * as d3Axis from "d3-axis";

/**
 * @slot - A spectrogram element to add axes to
 */
@customElement("oe-axes")
export class Axes extends SignalWatcher(LitElement) {
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

  @query("#x-axis-g")
  private xAxisG!: SVGGElement;

  @query("#y-axis-g")
  private yAxisG!: SVGGElement;

  @query("#axes-svg")
  private axisElement!: SVGElement;

  @queryAssignedElements()
  private slotElements!: Array<Spectrogram>;

  public updated() {
    this.updateAxes();
  }

  private spectrogramElement(): Spectrogram {
    return this.slotElements[0];
  }

  private renderWindow(): RenderWindow {
    const spectrogramElement = this.spectrogramElement();
    return spectrogramElement?.renderWindow?.value ?? [];
  }

  private updateAxes(): void {
    const xAxisTicks = this.xAxisTime();
    const yAxisTicks = this.yAxisHertz();

    const temporalFormat = d3.format(".1f") as any;
    const frequencyFormat = d3.format(".0f") as any;

    const xAxis = d3Axis
      .axisBottom(this.spectrogramElement()?.segmentToCanvasScale.value.temporal)
      .tickValues(xAxisTicks)
      .tickFormat(temporalFormat)
      .tickSize(this.spectrogramElement().renderCanvasSize.value.height);

    const yAxis = d3Axis
      .axisLeft(this.spectrogramElement()?.segmentToCanvasScale.value.frequency)
      .tickValues(yAxisTicks)
      .tickFormat(frequencyFormat)
      .tickSize(-this.spectrogramElement().renderCanvasSize.value.width);

    d3.select(this.xAxisG).call(xAxis);
    d3.select(this.yAxisG).call(yAxis);

    this.axisElement.style.width = `${this.spectrogramElement().renderCanvasSize.value.width}px`;
    this.axisElement.style.height = `${this.spectrogramElement().renderCanvasSize.value.height}px`;
  }

  private xAxisTime(): number[] {
    const renderWindow = this.renderWindow();
    const xn = renderWindow.endOffset;

    const result = [];
    for (let i = 0; i < xn; i += this.xStep) {
      result.push(i);
    }

    result.push(xn);

    return result;
  }

  private yAxisHertz(): number[] {
    const renderWindow = this.renderWindow();
    const yn = renderWindow.highFrequency;

    const result = [];
    for (let i = 0; i < yn; i += this.yStep) {
      result.push(i);
    }

    result.pop();
    result.push(yn);

    return result;
  }

  private xAxis(): number[][] {
    const renderWindow = this.renderWindow();
    const xn = renderWindow.endOffset;

    const result = [];
    for (let i = 0; i < xn; i += this.xStep) {
      const fractionalValue = this.spectrogramElement()?.segmentToFractionalScale.value.temporal(i);
      const canvasValue = this.spectrogramElement()?.segmentToCanvasScale.value.temporal(i);
      const time = i;
      result.push([time, canvasValue, fractionalValue]);
    }

    const fractionalValue = this.spectrogramElement()?.segmentToFractionalScale.value.temporal(xn);
    const canvasValue = this.spectrogramElement()?.segmentToCanvasScale.value.temporal(xn);
    const time = xn;
    result.push([time, canvasValue, fractionalValue]);

    return result;
  }

  private yAxis(): number[][] {
    const renderWindow = this.renderWindow();
    const yn = renderWindow.highFrequency;

    const result = [];
    for (let i = 0; i < yn; i += this.yStep) {
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
      <div id="wrapped-element">
        <svg id="axes-svg" viewBox="0 0 100% 100%">
          <g id="x-axis-g"></g>
          <g id="y-axis-g"></g>
        </svg>
        <slot @slotchange="${() => this.requestUpdate()}"></slot>
      </div>

      <ol id="x-axis" class="axis">
        x ${this.xAxis().map((i) => html`<li>${i[0]}s,${i[1]}px,${i[2]}</li>`)}
      </ol>

      <ol id="y-axis" class="axis">
        y
        ${this.yAxis()
          .reverse()
          .map((i) => html`<li>${i[0]}hz,${i[1]}px,${i[2]}</li>`)}
      </ol>
    `;
  }
}
