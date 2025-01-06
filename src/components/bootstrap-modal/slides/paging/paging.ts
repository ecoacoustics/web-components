import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridPageSprite } from "../../sprites/verification-grid.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";
import { progressBarSprite } from "../../sprites/progress-bar.sprite";
import anime from "animejs";

export class PagingSlide extends AbstractSlide {
  public constructor() {
    super("You can navigate through pages using the arrow buttons");
  }

  public play(): void {
    const animationDurationMs = 5_000;
    const halfTime = animationDurationMs / 2;

    const progressBarTimeline = anime.timeline({
      targets: ".view-head-segment",
      duration: animationDurationMs,
      autoplay: false,
    });

    // prettier-ignore
    progressBarTimeline
      .add({
        width: "var(--verification-head)",
        duration: halfTime,
      })
      .add({
        width: "calc(var(--verification-head) - 5%)",
        duration: halfTime,
      }, `+=${halfTime}`);

    setTimeout(() => {
      progressBarTimeline.play();
    }, 500);
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
