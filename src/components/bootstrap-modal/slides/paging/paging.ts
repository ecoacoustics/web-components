import { BootstrapSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridPageSprite } from "../../sprites/verification-grid.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";
import { progressBarSprite } from "../../sprites/progress-bar.sprite";

export function pagingSlide(): BootstrapSlide {
  const description = "You can navigate through pages using the arrow buttons";

  const slideTemplate = html`
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

  return { slideTemplate, description };
}
