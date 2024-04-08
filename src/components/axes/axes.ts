import { html, LitElement } from "lit";
import { customElement, property, queryAssignedElements } from "lit/decorators.js";
import { axesStyles } from "./css/style";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { Spectrogram } from "spectrogram/Spectrogram";
import { RenderWindow } from "models/rendering";

/**
 * @slot - A spectrogram element to add axes to
 */
@customElement("oe-axes")
export class Axes extends SignalWatcher(LitElement) {
  public constructor() {
    super();
  }

  public static styles = axesStyles;

  @property({ type: Number })
  public xStep: number = 1;

  @property({ attribute: "x-axis", type: Boolean, reflect: true })
  public showXAxis: boolean = true;

  @property({ attribute: "y-axis", type: Boolean, reflect: true })
  public showYAxis: boolean = true;

  @property({ attribute: "x-grid", type: Boolean, reflect: true })
  public showXGrid: boolean = true;

  @property({ attribute: "y-grid", type: Boolean, reflect: true })
  public showYGrid: boolean = true;

  @queryAssignedElements()
  private slotElements!: Array<HTMLElement>;

  private renderWindow(): RenderWindow | undefined {
    const spectrogramElement = this.slotElements[0] as Spectrogram;
    return spectrogramElement?.renderWindow;
  }

  private axesSeconds(): number {}

  private axesPx(): number {}

  private axesFraction(num: number): number {}

  private xAxis(): number[] {
    const renderWindow = this.renderWindow();

    if (!renderWindow) return [];

    const x0 = renderWindow.startOffset;
    const xn = renderWindow.endOffset;

    const xDelta = xn - x0;
    const step = Math.floor(xDelta / this.xStep);

    return Array.from(Array(this.xStep).keys()).map((x) => x * step);
  }

  private yAxis(): number[] {
    const renderWindow = this.renderWindow();

    if (!renderWindow) return [];

    const y0 = renderWindow.lowFrequency;
    const yn = renderWindow.highFrequency;

    const yDelta = yn - y0;
    const step = Math.floor(yDelta / this.xStep);

    return Array.from(Array(this.xStep).keys()).map((y) => y * step);
  }

  public render() {
    return html`
      <div id="axes-container">
        <div id="wrapped-element">
          <slot></slot>
        </div>

        <ol id="x-axis" class="axis">
          x ${this.xAxis().map((_, i) => html`<li>${i}s,${i}px,${i}.0</li>`)}
        </ol>
        <ol id="y-axis" class="axis">
          y
          ${this.yAxis()
            .reverse()
            .map((i) => html`<li>${i}s,${i}px,${i}.0</li>`)}
        </ol>
      </div>
    `;
  }
}
