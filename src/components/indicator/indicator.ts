import { SignalWatcher } from "@lit-labs/preact-signals";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { indicatorStyles } from "./css/style";
import { Spectrogram } from "../spectrogram/spectrogram";
import { UnitConverter } from "../../models/unitConverters";
import { queryDeeplyAssignedElements } from "../../helpers/decorators";

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

  @queryDeeplyAssignedElements({ selector: "oe-spectrogram" })
  private spectrogram!: Spectrogram;

  public xPos = 0;
  private time = 0;
  private offset = 0;
  private unitConverter!: UnitConverter;

  public handleSlotChange(): void {
    this.offset = this.spectrogram.offset;
    this.unitConverter = this.spectrogram.unitConverters!;

    this.spectrogram.currentTime.subscribe((elapsedTime: number) => {
      this.updateIndicator(elapsedTime);
    });
  }

  public updateIndicator(elapsedTime: number): void {
    this.time = elapsedTime + this.offset;
    const scale = this.unitConverter.renderWindowScale.value.temporal;

    this.xPos = scale(this.time);

    this.indicatorLine.style.transform = `translateX(${this.xPos}px)`;
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
