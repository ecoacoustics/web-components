import { SignalWatcher } from "@lit-labs/preact-signals";
import { html, LitElement } from "lit";
import { customElement, query, queryAssignedElements } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { indicatorStyles } from "./css/style";
import { Spectrogram } from "../spectrogram/spectrogram";
import { UnitConverter } from "../../models/unitConverters";

/**
 * A red line that displays the playback position on a spectrogram
 *
 * @csspart indicator-line - A css target to style the indicator line
 *
 * @slot - A spectrogram component to add an indicator to
 */
@customElement("oe-indicator")
export class Indicator extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = indicatorStyles;

  @query("#indicator-line")
  private indicatorLine!: SVGLineElement;

  @queryAssignedElements()
  private slotElements!: HTMLElement[];

  public xPos = 0;
  private time = 0;
  private offset = 0;
  private unitConverter!: UnitConverter;

  public handleSlotChange(): void {
    const spectrogram = this.getSpectrogramElement();

    this.offset = spectrogram.offset;
    this.unitConverter = spectrogram.unitConverters!;

    spectrogram.currentTime.subscribe((elapsedTime: number) => {
      this.updateIndicator(elapsedTime);
    });
  }

  public updateIndicator(elapsedTime: number): void {
    this.time = elapsedTime + this.offset;
    const scale = this.unitConverter.renderWindowScale.value.temporal;

    this.xPos = scale(this.time);

    this.indicatorLine.style.transform = `translateX(${this.xPos}px)`;
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
      } else {
        throw new Error("oe-spectrogram is not defined");
      }
    }

    throw new Error("No spectrogram element found");
  }

  public render() {
    return html`
      <div id="wrapped-element">
        <svg id="indicator-svg">
          <line id="indicator-line" part="indicator-line" y1="0" y2="100%"></line>
        </svg>
        <slot @slotchange="${this.handleSlotChange}"></slot>
      </div>
    `;
  }
}
