import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridPageSprite } from "../../sprites/verification-grid.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";
import { progressBarSprite } from "../../sprites/progress-bar.sprite";
import { VerificationBootstrapComponent } from "bootstrap-modal/bootstrap-modal";
import { animate, AnimationSequence } from "motion";

export class PagingSlide extends AbstractSlide {
  public constructor() {
    super("You can navigate through pages using the arrow buttons");
  }

  public play(): void {
    const animationDurationMs = 5_000;
    const halfTime = animationDurationMs / 2;

    const sequence = [
      [".view-head-segment", { width: "var(--verification-head)" }, { duration: halfTime }],
      [".view-head-segment", { width: "var(--verification-head) - 5%" }, { duration: halfTime }],
    ] satisfies AnimationSequence;

    animate(sequence, {
      duration: animationDurationMs,
      repeat: VerificationBootstrapComponent.animationRepeats,
    });
  }

  public stop(): void {}

  public render() {
    return html`
      <div class="paging-slide slide">
        <svg viewBox="0 0 300 180">
          <g class="pages">
            <g class="previous-page">${verificationGridPageSprite()}</g>
            <g class="current-page">${verificationGridPageSprite()}</g>
          </g>

          ${progressBarSprite(10, 75)} ${cursorSprite(32, 157)}
        </svg>
      </div>
    `;
  }
}
