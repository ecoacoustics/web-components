import { html, LitElement } from "lit";
import { customElement, property, query, queryAssignedElements } from "lit/decorators.js";
import { axesStyles } from "./css/style";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { RenderWindow } from "../models/rendering";
import { Spectrogram } from "../../../playwright";
import * as d3 from "d3";
import * as d3Axis from "d3-axis";
import { AbstractComponent } from "../mixins/abstractComponent";

/**
 * @slot - A spectrogram element to add axes to
 *
 * @csspart axes - Used to style axis elements. Usually used to add padding/margin
 */
@customElement("oe-axes")
export class Axes extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = axesStyles;

  @property({ attribute: "x-step", type: Number })
  public userXStep?: number; // second

  @property({ attribute: "y-step", type: Number })
  public userYStep?: number; // hertz

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

  @query("#x-gridlines-g")
  private xGridlinesG!: SVGGElement;

  @query("#y-gridlines-g")
  private yGridlinesG!: SVGGElement;

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
    const temporalScale = this.spectrogramElement()?.segmentToCanvasScale.value.temporal;
    const frequencyScale = this.spectrogramElement()?.segmentToCanvasScale.value.frequency;

    const temporalFormat = d3.format(".1f") as any;
    const frequencyFormat = d3.format(".0f") as any;

    const xAxisTicks = this.xAxisTime();
    const yAxisTicks = this.yAxisHertz();

    const xAxis = d3Axis.axisBottom(temporalScale).tickValues(xAxisTicks).tickFormat(temporalFormat);
    const yAxis = d3Axis.axisLeft(frequencyScale).tickValues(yAxisTicks).tickFormat(frequencyFormat);

    d3.select(this.xGridlinesG)
      .selectAll("line")
      .data(xAxisTicks)
      .enter()
      .each((x: number) => {
        d3.select(this.xGridlinesG)
          .append("line")
          .attr("x1", temporalScale(x))
          .attr("x2", temporalScale(x))
          .attr("y1", 0)
          .attr("y2", this.spectrogramElement().renderCanvasSize.value.height);
      });

    d3.select(this.yGridlinesG)
      .selectAll("line")
      .data(yAxisTicks)
      .enter()
      .each((x: number) => {
        d3.select(this.yGridlinesG)
          .append("line")
          .attr("x1", 0)
          .attr("x2", this.spectrogramElement().renderCanvasSize.value.width)
          .attr("y1", frequencyScale(x))
          .attr("y2", frequencyScale(x));
      });

    d3.select(this.xAxisG).call(xAxis);
    d3.select(this.yAxisG).call(yAxis);
  }

  private xAxisTime(): number[] {
    const renderWindow = this.renderWindow();
    const x0 = renderWindow.startOffset;
    const xn = renderWindow.endOffset;

    const result = [];
    for (let i = x0; i < xn; i += this.xStep()) {
      result.push(i);
    }

    // TODO: Find a better algorithm for this
    if (xn - result[result.length - 1] < this.xStep() / 2) {
      result.pop();
    }

    result.push(xn);

    return result;
  }

  private yAxisHertz(): number[] {
    const renderWindow = this.renderWindow();
    const y0 = renderWindow.lowFrequency;
    const yn = renderWindow.highFrequency;

    const result = [];
    for (let i = y0; i < yn; i += this.yStep()) {
      result.push(i);
    }

    result.pop();
    result.push(yn);

    return result;
  }

  private xAxis(): number[][] {
    const renderWindow = this.renderWindow();
    const x0 = renderWindow.startOffset;
    const xn = renderWindow.endOffset;

    const result = [];
    for (let i = x0; i < xn; i += this.xStep()) {
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
    for (let i = 0; i < yn; i += this.yStep()) {
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

  // this is the "sane" defaults for the x-axis step
  // it if is explicitly overwritten in the spectrogram attributes
  // we will not contest it (we allow overlapping labels, grid lines, etc.. if the user explicitly defines a step)
  private xStep(): number {
    if (this.userXStep) {
      return this.userXStep;
    }

    // we can not use the d3 default tick function because it is possible for labels
    // to be overlapping
    // const scale = this.spectrogramElement().segmentToCanvasScale.value.temporal;
    // const defaultXTicks = scale.ticks.apply(scale, []);
    // return defaultXTicks[1] - defaultXTicks[0];

    const labelFontSize = 10; //px
    const labelPadding = 10; //px

    const widthForEachLabel = labelFontSize + labelPadding * 2; //px
    const canvasWidth = this.spectrogramElement().renderCanvasSize.value.width;

    const numberOfLabels = Math.floor(canvasWidth / widthForEachLabel);

    const scale = this.spectrogramElement().segmentToCanvasScale.value.temporal;
    const x1 = scale.invert(0);
    const xn = scale.invert(this.spectrogramElement().renderCanvasSize.value.width);
    const xDelta = xn - x1;

    return Number((xDelta / numberOfLabels).toFixed(1));
  }

  private yStep(): number {
    if (this.userYStep) {
      return this.userYStep;
    }

    const labelFontSize = 10; //px
    const labelPadding = 5; //px

    const heightForEachLabel = labelFontSize + labelPadding * 2; //px
    const canvasHeight = this.spectrogramElement().renderCanvasSize.value.height;

    const numberOfLabels = Math.floor(canvasHeight / heightForEachLabel);

    const scale = this.spectrogramElement().segmentToCanvasScale.value.frequency;
    const y0 = scale.invert(this.spectrogramElement().renderCanvasSize.value.height);
    const yn = scale.invert(0);
    const yDelta = yn - y0;

    return Number((yDelta / numberOfLabels).toFixed(1));
  }

  public render() {
    return html`
      <div id="wrapped-element">
        <svg id="axes-svg">
          <g id="x-axis-g"></g>
          <g id="y-axis-g"></g>
          <g id="x-gridlines-g"></g>
          <g id="y-gridlines-g"></g>
        </svg>
        <slot></slot>
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
