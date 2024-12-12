import { importSprites } from "../../../../helpers/svgs/imports";
import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridSprite } from "../../sprites/verification-grid.sprite";
import gridTile from "../../sprites/grid-tile.svg?raw";
import progressBar from "../../sprites/progress-bar.svg?raw";
import cursorSprite from "../../sprites/cursor.svg?raw";

export class PagingSlide extends AbstractSlide {
  public constructor() {
    super("You can navigate through the pages using the arrows");
  }

  public render() {
    return html`
      <div class="paging-slide html-slide">
        <svg viewBox="0 0 390 230">
          ${importSprites(gridTile, progressBar, cursorSprite)}

          <g class="paging-pages">
            <g class="paging-page-current">${verificationGridSprite()}</g>
            <g class="paging-page-next">${verificationGridSprite()}</g>
          </g>

          <use href="#progress-bar" x="0" y="80" style="--progress: 90px" />
          <use class="paging-cursor" href="#cursor" x="23" y="190" />
        </svg>
      </div>
    `;
  }
}
