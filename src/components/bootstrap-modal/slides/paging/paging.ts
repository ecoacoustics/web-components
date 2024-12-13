import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridPageSprite } from "../../sprites/verification-grid.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";
import { progressBarSprite } from "../../sprites/progress-bar.sprite";

export class PagingSlide extends AbstractSlide {
  public constructor() {
    super("You can navigate through the pages using the arrows");
  }

  public render() {
    return html`
      <div class="paging-slide html-slide">
        <svg viewBox="0 0 300 230">
          <g class="pages">
            <g class="previous-page">${verificationGridPageSprite()}</g>
            <g class="current-page">${verificationGridPageSprite()}</g>
          </g>

          ${progressBarSprite(10, 50)} ${cursorSprite(32, 157)}
        </svg>
      </div>
    `;
  }
}
