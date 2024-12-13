import { importSprites } from "../../../../helpers/svgs/imports";
import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridPageSprite } from "../../sprites/verification-grid.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";
import gridTile from "../../sprites/grid-tile.svg?raw";
import progressBar from "../../sprites/progress-bar.svg?raw";

export class PagingSlide extends AbstractSlide {
  public constructor() {
    super("You can navigate through the pages using the arrows");
  }

  public render() {
    return html`
      <div class="paging-slide html-slide">
        <svg viewBox="0 0 390 230">
          ${importSprites(gridTile, progressBar)}

          <g class="pages">
            <g class="previous-page">${verificationGridPageSprite()}</g>
            <g class="current-page">${verificationGridPageSprite()}</g>
          </g>

          <use href="#progress-bar" class="progress-bar" x="10" y="50" />
          ${cursorSprite(30, 156)}
        </svg>
      </div>
    `;
  }
}
