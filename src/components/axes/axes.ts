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

  private spectrogramElement(): Spectrogram | any {
    for (const slotElement of this.slotElements) {
      if (slotElement instanceof Spectrogram) {
        return slotElement;
      }

      const spectrogramSubElement = (slotElement as any).querySelector("oe-spectrogram");
      if (spectrogramSubElement instanceof Spectrogram) {
        return spectrogramSubElement;
      }
    }
  }

  private renderWindow(): RenderWindow {
    const spectrogramElement = this.spectrogramElement();
    return spectrogramElement?.renderWindow?.value ?? [];
  }

  private updateAxes(): void {
    const temporalScale = this.spectrogramElement()?.renderWindowScale.value.temporal;
    const frequencyScale = this.spectrogramElement()?.renderWindowScale.value.frequency;

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
      .each((x: number, i: number) => {
        if (i !== xAxisTicks.length - 1 && i !== 0) {
          d3.select(this.xGridlinesG)
            .append("line")
            .attr("x1", temporalScale(x) + 0.5)
            .attr("x2", temporalScale(x) + 0.5)
            .attr("y1", 0)
            .attr("y2", this.spectrogramElement().renderCanvasSize.value.height);
        }
      });

    d3.select(this.yGridlinesG)
      .selectAll("line")
      .data(yAxisTicks)
      .enter()
      .each((x: number, i: number) => {
        if (i !== yAxisTicks.length - 1 && i !== 0) {
          d3.select(this.yGridlinesG)
            .append("line")
            .attr("x1", 0)
            .attr("x2", this.spectrogramElement().renderCanvasSize.value.width)
            .attr("y1", frequencyScale(x) + 0.5)
            .attr("y2", frequencyScale(x) + 0.5);
        }
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

  // this is the "sane" defaults for the x-axis step
  // it if is explicitly overwritten in the spectrogram attributes
  // we will not contest it (we allow overlapping labels, grid lines, etc.. if the user explicitly defines a step)
  private xStep(): number {
    if (this.userXStep) {
      return this.userXStep;
    }
    const scale = this.spectrogramElement().renderWindowScale.value.temporal;
    const x1 = scale.invert(0);
    const xn = scale.invert(this.spectrogramElement().renderCanvasSize.value.width);

    const midpoint = (xn + x1) / 2;

    return Math.pow(10, Math.floor(Math.log10(midpoint)));
  }

  private yStep(): number {
    if (this.userYStep) {
      return this.userYStep;
    }
    const scale = this.spectrogramElement().renderWindowScale.value.frequency;
    const y0 = scale.invert(this.spectrogramElement().renderCanvasSize.value.height);
    const yn = scale.invert(0);

    const midpoint = (yn + y0) / 2;

    return Math.pow(10, Math.floor(Math.log10(midpoint)));
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
    `;
  }
}
