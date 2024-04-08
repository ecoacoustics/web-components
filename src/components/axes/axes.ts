import { html, LitElement } from "lit";
import { customElement, property, queryAssignedElements } from "lit/decorators.js";
import { axesStyles } from "./css/style";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { Spectrogram } from "spectrogram/Spectrogram";

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
  public step: number = 1;

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

  private xRange: number = 6;
  private yRange: number = 6;

  public firstUpdated(): void {
    const spectrogramElement = this.slotElements[0] as Spectrogram;
  }

  public render() {
    return html`
      <div id="axes-container">
        <div id="wrapped-element">
          <slot></slot>
        </div>

        <ol id="x-axis" class="axis">
          x ${Array.from({ length: this.xRange }).map((_, i) => html`<li>${i}s,${i}px,${i}.0</li>`)}
        </ol>
        <ol id="y-axis" class="axis">
          y
          ${Array.from(Array(this.yRange).keys())
            .reverse()
            .map((i) => html`<li>${i}s,${i}px,${i}.0</li>`)}
        </ol>
      </div>
    `;
  }
}
