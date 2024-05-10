import { html, LitElement } from "lit";
import { customElement, property, query, queryAssignedElements } from "lit/decorators.js";
import { axesStyles } from "./css/style";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { RenderWindow } from "../models/rendering";
import { Spectrogram } from "../../../playwright";
import * as d3 from "d3";
import * as d3Axis from "d3-axis";
import { AbstractComponent } from "../mixins/abstractComponent";
import { Hertz, Seconds } from "models/unitConverters";
import { ScaleLinear } from "d3";

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
 * @csspart tick - Apply styles to both x and y ticks
 * @csspart grid - Apply styles to both x and y ticks
 * @csspart x-grid - Apply styles to only the x grid lines
 * @csspart y-grid - Apply styles to only the y grid lines
 *
 * @slot - A spectrogram element to add axes to
 */
@customElement("oe-axes")
export class Axes extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = axesStyles;

  @property({ attribute: "x-step", type: Number, reflect: true })
  public userXStep?: Seconds;

  @property({ attribute: "y-step", type: Number, reflect: true })
  public userYStep?: Hertz;

  @property({ attribute: "x-axis", type: Boolean, reflect: true })
  public showXAxis = true;

  @property({ attribute: "y-axis", type: Boolean, reflect: true })
  public showYAxis = true;

  @property({ attribute: "x-grid", type: Boolean, reflect: true })
  public showXGrid = false;

  @property({ attribute: "y-grid", type: Boolean, reflect: true })
  public showYGrid = false;

  @property({ attribute: "x-label", type: Boolean, reflect: true })
  public showXLabel = false;

  @property({ attribute: "y-label", type: Boolean, reflect: true })
  public showYLabel = false;

  @query("#x-axis-g")
  private xAxisG!: SVGGElement;

  @query("#y-axis-g")
  private yAxisG!: SVGGElement;

  @query("#x-gridlines-g")
  private xGridlinesG!: SVGGElement;

  @query("#y-gridlines-g")
  private yGridlinesG!: SVGGElement;

  @queryAssignedElements()
  private slotElements!: Spectrogram[];

  private spectrogramElement!: Spectrogram;
  private temporalScale!: ScaleLinear<number, number, never>;
  private frequencyScale!: ScaleLinear<number, number, never>;
  private renderWindow!: RenderWindow;

  public updated() {
    this.spectrogramElement = this.getSpectrogramElement();

    this.temporalScale = this.spectrogramElement.unitConverters!.renderWindowScale.value.temporal;
    this.frequencyScale = this.spectrogramElement.unitConverters!.renderWindowScale.value.frequency;
    this.renderWindow = this.spectrogramElement.renderWindow?.value;

    this.updateAxes();
  }

  private getSpectrogramElement(): Spectrogram {
    for (const slotElement of this.slotElements) {
      const queriedElement = slotElement.querySelector("oe-spectrogram");

      if (queriedElement instanceof Spectrogram) {
        return queriedElement;
      }
    }

    throw new Error("No spectrogram element found");
  }

  // private drawAxis(
  //   scale: ScaleLinear<number, number, never>,
  //   start: Seconds | Hertz,
  //   end: Seconds | Hertz,
  //   rotation: number,
  // ): void {
  // }

  private updateAxes(): void {
    const temporalFormat = d3.format(".1f");
    const frequencyFormat = d3.format(".0f");

    const xAxisTicks = this.xAxisTime();
    const yAxisTicks = this.yAxisHertz();

    const xAxis = d3Axis.axisBottom(this.temporalScale).tickValues(xAxisTicks).tickFormat(temporalFormat);
    const yAxis = d3Axis.axisLeft(this.frequencyScale).tickValues(yAxisTicks).tickFormat(frequencyFormat);

    const xAxisElement = d3
      .select(this.xGridlinesG)
      .selectAll("line")
      .data(xAxisTicks)
      .enter()
      .each((x: number, i: number) => {
        if (i !== xAxisTicks.length - 1 && i !== 0) {
          d3.select(this.xGridlinesG)
            .append("line")
            .attr("x1", this.temporalScale(x) + 0.5)
            .attr("x2", this.temporalScale(x) + 0.5)
            .attr("y1", 0)
            .attr("y2", this.spectrogramElement.renderCanvasSize.value.height);
        }
      });

    if (this.showXLabel) {
      xAxisElement
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", this.spectrogramElement.renderCanvasSize.value.width)
        .attr("y", this.spectrogramElement.renderCanvasSize.value.height - 6)
        .attr("dy", "2.75em")
        .attr("dx", "-50%")
        .text("Time (seconds)");
    }

    const yAxisElement = d3
      .select(this.yGridlinesG)
      .selectAll("line")
      .data(yAxisTicks)
      .enter()
      .each((x: number, i: number) => {
        if (i !== yAxisTicks.length - 1 && i !== 0) {
          d3.select(this.yGridlinesG)
            .append("line")
            .attr("x1", 0)
            .attr("x2", this.spectrogramElement.renderCanvasSize.value.width)
            .attr("y1", this.frequencyScale(x) + 0.5)
            .attr("y2", this.frequencyScale(x) + 0.5);
        }
      });

    if (this.showYLabel) {
      yAxisElement
        .append("text")
        .attr("text-anchor", "middle")
        .attr("y", -6)
        .attr("dy", "-2.75em")
        .attr("dx", "-50%")
        .attr("transform", "rotate(-90)")
        .text("Frequency (hz)");
    }

    d3.select(this.xAxisG).call(xAxis);
    d3.select(this.yAxisG).call(yAxis);
  }

  private xAxisTime(): number[] {
    const x0 = this.renderWindow.startOffset;
    const xn = this.renderWindow.endOffset;

    const spectrogramElement = this.spectrogramElement;
    const maximumValue = spectrogramElement.renderCanvasSize.value.width;
    const xStep = this.userXStep || this.calculateStep(maximumValue, this.temporalScale);

    const result = [];
    for (let i = x0; i < xn; i += xStep) {
      result.push(i);
    }

    result.push(xn);

    return result;
  }

  private yAxisHertz(): number[] {
    const y0 = this.renderWindow.lowFrequency;
    const yn = this.renderWindow.highFrequency;

    const spectrogramElement = this.spectrogramElement;
    const maximumValue = spectrogramElement.renderCanvasSize.value.height;
    const yStep = this.userYStep || this.calculateStep(maximumValue, this.frequencyScale);

    const result = [];
    for (let i = y0; i < yn; i += yStep) {
      result.push(i);
    }

    result.pop();
    result.push(yn);

    return result;
  }

  private calculateStep(pxMaximum: number, scale: any): number {
    const largestValue = scale.invert(pxMaximum);
    const smallestValue = scale.invert(0);

    const midpoint = (smallestValue + largestValue) / 4;

    return Math.pow(10, Math.floor(Math.log10(midpoint)));
  }

  public render() {
    return html`
      <div id="wrapped-element">
        <svg id="axes-svg">
          <g part="tick">
            <g id="x-axis-g" part="x-ticks"></g>
            <g id="y-axis-g" part="y-ticks"></g>
          </g>

          <g part="grid">
            <g id="x-gridlines-g" part="x-grid"></g>
            <g id="y-gridlines-g" part="y-grid"></g>
          </g>
        </svg>

        <slot></slot>
      </div>
    `;
  }
}
