import { SignalWatcher } from "@lit-labs/preact-signals";
import { html, LitElement } from "lit";
import { customElement, queryAssignedElements } from "lit/decorators.js";
import { AbstractComponent } from "../mixins/abstractComponent";
import { indicatorStyles } from "./css/style";
import { Spectrogram } from "../spectrogram/spectrogram";

/**
 * @slot - A spectrogram component to add an indicator to
 *
 * @csspart indicator-line - The line that indicates the current position
 */
@customElement("oe-indicator")
export class Indicator extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = indicatorStyles;

  @queryAssignedElements()
  private slotElements!: Array<HTMLElement>;

  private time: number = 0;

  public firstUpdated(): void {
    this.spectrogramElement().currentTime.subscribe(() => {
      this.updateIndicator();
    });
  }

  private spectrogramElement(): Spectrogram | any {
    for (const slotElement of this.slotElements) {
      if (slotElement instanceof Spectrogram) {
        return slotElement;
      }

      const spectrogram = slotElement.querySelector("oe-spectrogram");
      if (spectrogram instanceof Spectrogram) {
        return spectrogram;
      }
    }
  }

  private updateIndicator(): void {
    this.time = this.spectrogramElement().currentTime.value + this.spectrogramElement().offset;

    const scale = this.spectrogramElement().segmentToCanvasScale.value.temporal;

    const x = scale(this.time);

    const indicatorLine = this.shadowRoot?.querySelector("#indicator-line") as SVGLineElement;
    indicatorLine.setAttribute("x1", x.toString());
    indicatorLine.setAttribute("x2", x.toString());
  }

  public render() {
    return html`
      <div id="wrapped-element">
        <svg id="indicator-svg">
          <line part="indicator-line" id="indicator-line" x1="0" x2="0" y0="0" y2="100%"></line>
        </svg>
        <slot></slot>
      </div>
    `;
  }
}
