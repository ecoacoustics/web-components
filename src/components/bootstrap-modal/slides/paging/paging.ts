import { importSprites } from "../../../../helpers/svgs/imports";
import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridSprite } from "../../sprites/verification-grid.sprite";
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

          <g class="paging-pages">
            <g class="paging-page-previous">${verificationGridSprite()}</g>
            <g class="paging-page-current">${verificationGridSprite()}</g>
          </g>

          <use href="#progress-bar" class="paging-progress-bar" x="10" y="50" />
          ${cursorSprite("paging-cursor", 30, 156)}
        </svg>
      </div>
    `;
  }
}
