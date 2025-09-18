import { computed, ReadonlySignal, watch } from "@lit-labs/preact-signals";
import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { UnitConverter } from "../../models/unitConverters";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { Size } from "../../models/rendering";
import { ChromeProvider } from "../../mixins/chrome/chromeProvider/chromeProvider";
import { ChromeTemplate } from "../../mixins/chrome/types";
import indicatorStyles from "./css/style.css?inline";

/**
 * @description
 * A vertical line that displays the playback position on a spectrogram
 *
 * This component must wrap a spectrogram component.
 *
 * @csspart indicator-line - A css target to style the indicator line
 * @csspart seek-icon - A css target to style the seek icon underneath the indicator line
 *
 * @slot - A spectrogram component to add an indicator to
 */
@customElement("oe-indicator")
export class IndicatorComponent extends ChromeProvider(LitElement) {
  public static styles = unsafeCSS(indicatorStyles);

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram?: SpectrogramComponent;

  @query("#indicator-svg")
  private indicatorSvg!: Readonly<SVGElement>;

  // TODO: investigate why I am de-referencing the signal here. Wouldn't it be
  // easier to work with and more performant with a reactive signal
  @state()
  private unitConverter?: UnitConverter;
  private computedTimePx: ReadonlySignal<number> = computed(() => 0);

  protected handleSlotChange(): void {
    if (!this.spectrogram) {
      console.warn("An oe-indicator component was updated without an oe-spectrogram component.");

      // we explicitly set the unit converter back to undefined so that if the
      // spectrogram component is removed (or moved/reassigned) after
      // initialization, this component won't have an outdated unit converter
      // from a moved or removed spectrogram component
      this.unitConverter = undefined;
      return;
    }

    this.spectrogram.unitConverters.subscribe((newUnitConverter?: UnitConverter) => {
      this.unitConverter = newUnitConverter;

      if (this.unitConverter) {
        this.unitConverter.canvasSize.subscribe((value) => this.handleCanvasResize(value));
      }

      this.computedTimePx = computed(() => {
        if (!this.spectrogram || !this.unitConverter) {
          return 0;
        }

        const time = this.spectrogram.currentTime;
        const scale = this.unitConverter.scaleX.value;
        return scale(time.value);
      });
    });
  }

  private handleCanvasResize(canvasSize: Size): void {
    if (this?.indicatorSvg) {
      const { width, height } = canvasSize;
      this.indicatorSvg.style.width = `${width}px`;
      this.indicatorSvg.style.height = `${height}px`;
    }
  }

  public chromeOverlay(): ChromeTemplate {
    if (!this.unitConverter) {
      return nothing;
    }

    return html`
      <svg id="indicator-svg">
        <g id="indicator-group" style="transform: translateX(${watch(this.computedTimePx)}px);">
          <line id="indicator-line" part="indicator-line" y1="0" y2="100%"></line>
          <circle id="seek-icon" part="seek-icon" cy="100%" r="5" />
        </g>
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-indicator": IndicatorComponent;
  }
}
