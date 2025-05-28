import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, TemplateResult, unsafeCSS } from "lit";
import { when } from "lit/directives/when.js";
import { classMap } from "lit/directives/class-map.js";
import { WithShoelace } from "../../mixins/withShoelace";
import progressBarStyles from "./css/style.css?inline";

/**
 * @description
 * A progress bar that indicates how far through a task you are.
 */
@customElement("oe-progress-bar")
export class ProgressBar extends WithShoelace(AbstractComponent(LitElement)) {
  public static styles = unsafeCSS(progressBarStyles);

  /** Where the verification head is at */
  @property({ attribute: "history-head", type: Number })
  public historyHead = 0;

  /** The total number of items in the data set */
  @property({ type: Number })
  public total?: number;

  /** The completion head */
  @property({ type: Number })
  public completed = 0;

  private segmentLength(value: number): number {
    if (!this.total || this.total < 0) {
      // if the paging callback does not provide a total number of items, we
      // use a logarithmic function that does not reach 100%
      // https://www.wolframalpha.com/input?i=0.99+-+e%5E%28-0.03x%29+from+0+to+300
      //
      // we use 0.99 as the maximum so that  the progress bar will never reach
      // 100% even with fractional rounding
      // using an exponent multiple of -0.03 means that we can have a (realistic)
      // maximum of up to 170 items
      const logarithmicFunction = (x: number) => 0.99 - Math.E ** (-0.03 * x);

      // because the logarithmic function returns a value from 0 to 1
      // we multiply the logarithmic function value by 100 to get a percentage
      return logarithmicFunction(value) * 100;
    }

    const percentagePerValue = 100 / this.total;
    return value * percentagePerValue;
  }

  public render(): TemplateResult {
    const completedPercentage = this.segmentLength(this.completed);
    const viewHeadPercentage = this.segmentLength(this.historyHead);
    const viewHeadPercentageDelta = completedPercentage - viewHeadPercentage;
    const isViewingHistory = this.historyHead < this.completed;

    const completedTooltip = `${this.completed} / ${this.total} (${completedPercentage.toFixed(2)}%) audio segments completed${isViewingHistory ? " (viewing history)" : ""}`;
    const viewHeadHistoryTooltip = `Viewing history from segment ${this.historyHead} / ${this.total} (${viewHeadPercentage.toFixed(2)}%)`;

    const completedSegmentClasses = classMap({
      "offset-segment": viewHeadPercentage > 0,
    });

    // prettier-ignore
    return html`
      <div role="progressbar" class="progress-bar">
        ${when(viewHeadPercentage > 0, () => html`
          <sl-tooltip
            content="${isViewingHistory ? viewHeadHistoryTooltip : completedTooltip}"
            data-testid="view-head-tooltip"
          >
            <span class="segment head-segment" style="width: ${viewHeadPercentage}%"></span>
          </sl-tooltip>
        `)}

        ${when(viewHeadPercentageDelta > 0, () => html`
          <sl-tooltip content="${completedTooltip}" data-testid="completed-tooltip">
            <span
              class="segment completed-segment ${completedSegmentClasses}"
              style="width: ${viewHeadPercentageDelta}%"
            ></span>
          </sl-tooltip>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-progress-bar": ProgressBar;
  }
}
