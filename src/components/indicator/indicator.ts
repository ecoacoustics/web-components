import { computed, ReadonlySignal, watch } from "@lit-labs/preact-signals";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, query } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { UnitConverter } from "../../models/unitConverters";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { Size } from "../../models/rendering";
import indicatorStyles from "./css/style.css?inline";

/**
 * @description
 * A red line that displays the playback position on a spectrogram
 *
 * @csspart indicator-line - A css target to style the indicator line
 * @csspart seek-icon - A css target to style the seek icon underneath the indicator line
 *
 * @slot - A spectrogram component to add an indicator to
 */
@customElement("oe-indicator")
export class IndicatorComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(indicatorStyles);

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram?: SpectrogramComponent;

  @query("#wrapped-element")
  private wrappedElement!: Readonly<HTMLDivElement>;

  public xPos = 0;
  private unitConverter?: UnitConverter;

  private computedTimePx: ReadonlySignal<number> = computed(() => 0);

  public handleSlotChange(): void {
    if (this.spectrogram && this.spectrogram.unitConverters) {
      this.unitConverter = this.spectrogram.unitConverters.value;

      this.computedTimePx = computed(() => {
        if (!this.spectrogram || !this.unitConverter) {
          return 0;
        }

        const time = this.spectrogram.currentTime;
        const scale = this.unitConverter.scaleX.value;
        return scale(time.value);
      });

      if (this.unitConverter) {
        this.unitConverter.canvasSize.subscribe(this.handleCanvasResize);
      }
    }
  }

  private handleCanvasResize(canvasSize: Size): void {
    if (this?.wrappedElement) {
      const { width, height } = canvasSize;
      this.wrappedElement.style.width = `${width}px`;
      this.wrappedElement.style.height = `${height}px`;
    }
  }

  public render() {
    return html`
      <div id="wrapped-element">
        <svg id="indicator-svg">
          <g id="indicator-group" style="transform: translateX(${watch(this.computedTimePx)}px)">
            <line part="indicator-line" y1="0" y2="100%"></line>
            <circle id="seek-icon" part="seek-icon" cy="100%" r="5" />
          </g>
        </svg>
        <slot @slotchange="${this.handleSlotChange}"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-indicator": IndicatorComponent;
  }
}
