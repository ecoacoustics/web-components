import { computed, ReadonlySignal, watch } from "@lit-labs/preact-signals";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { indicatorStyles } from "./css/style";
import { Spectrogram } from "../spectrogram/spectrogram";
import { UnitConverter } from "../../models/unitConverters";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";

/**
 * A red line that displays the playback position on a spectrogram
 *
 * @csspart indicator-line - A css target to style the indicator line
 * @csspart seek-circle - A css target to style the seek icon underneath the indicator line
 *
 * @slot - A spectrogram component to add an indicator to
 */
@customElement("oe-indicator")
export class Indicator extends AbstractComponent(LitElement) {
  public static styles = indicatorStyles;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram: Spectrogram | undefined;

  public xPos = 0;
  private unitConverter!: UnitConverter;

  private computedTimePx: ReadonlySignal<number> = computed(() => 0);

  public handleSlotChange(): void {
    if (this.spectrogram) {
      this.unitConverter = this.spectrogram.unitConverters!;

      this.computedTimePx = computed(() => {
        const time = this.spectrogram!.currentTime;
        const scale = this.unitConverter.renderWindowScale.value.temporal;
        return scale.scale(time.value);
      });
    }
  }

  public render() {
    return html`
      <div id="wrapped-element">
        <svg id="indicator-svg">
          <g id="indicator-line" style="transform: translateX(${watch(this.computedTimePx)}px)">
            <line part="indicator-line" y1="0" y2="100%"></line>
            <circle id="seek-icon" part="seek-icon" cy="100%" r="5" />
          </g>
        </svg>
        <slot @slotchange="${this.handleSlotChange}"></slot>
      </div>
    `;
  }
}
