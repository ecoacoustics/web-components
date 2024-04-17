import { SignalWatcher } from "@lit-labs/preact-signals";
import { html, LitElement } from "lit";
import { customElement, query, queryAssignedElements } from "lit/decorators.js";
import { AbstractComponent } from "../mixins/abstractComponent";
import { indicatorStyles } from "./css/style";
import { Spectrogram } from "../spectrogram/spectrogram";

/**
 * @slot - A spectrogram component to add an indicator to
 *
 * @csspart indicator-line - The line that indicates the current position
 *
 * @slot - The spectrogram component to add an indicator to
 */
@customElement("oe-indicator")
export class Indicator extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = indicatorStyles;

  @query("#indicator-line")
  private indicatorLine!: SVGLineElement;

  @queryAssignedElements()
  private slotElements!: Array<HTMLElement>;

  public xPos: number = 0;
  private time: number = 0;
  private offset: number = 0;

  public firstUpdated(): void {
    if (this.slotElements.length === 0) {
      throw new Error("No spectrogram component found in the slot");
    }

    this.offset = this.spectrogramElement().offset;
    this.spectrogramElement().currentTime.subscribe((elapsedTime: number) => {
      this.updateIndicator(elapsedTime);
    });
  }

  public updateIndicator(elapsedTime: number): void {
    this.time = elapsedTime + this.offset;
    const scale = this.spectrogramElement().segmentToCanvasScale.value.temporal;

    this.xPos = scale(this.time);

    this.indicatorLine.style.transform = `translate3d(${this.xPos}px, 0, 0)`;
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

  public render() {
    return html`
      <div id="wrapped-element">
        <svg id="indicator-svg">
          <line id="indicator-line" part="indicator-line" y1="0" y2="100%"></line>
        </svg>
        <slot></slot>
      </div>
    `;
  }
}
