import { importSprites } from "../../../helpers/svgs/imports";
import { AbstractSlide } from "./abstractSlide";
import { svg } from "lit";
import { verificationGridSprite } from "./sprites/verification-grid.sprite";
import gridTile from "./sprites/grid-tile.svg?raw";
import decisionButtons from "./sprites/decision-buttons.svg?raw";
import progressBar from "./sprites/progress-bar.svg?raw";
import cursorSprite from "./sprites/cursor.svg?raw";

export class PagingSlide extends AbstractSlide {
  public constructor() {
    super("You can navigate through the pages using the arrows");
  }

  public render() {
    return svg`
      <g class="paging-slide">
        ${importSprites(gridTile, decisionButtons, progressBar, cursorSprite)}

        ${verificationGridSprite()}

        <use href="#decision-buttons" x="125" y="140" />
        <use href="#progress-bar" x="0" y="80" style="--progress: 90px" />

        <use class="paging-cursor" href="#cursor" x="23" y="190" />
      </g>
    `;
  }
}
