import { importSprites } from "../../../helpers/svgs/imports";
import { AbstractSlide } from "./abstractSlide";
import { svg } from "lit";
import { verificationGridSprite } from "./sprites/verification-grid.sprite";
import gridTile from "./sprites/grid-tile.svg?raw";
import decisionButtons from "./sprites/decision-buttons.svg?raw";
import progressBar from "./sprites/progress-bar.svg?raw";
import attentionCircle from "./sprites/attention-circle.svg?raw";

export class PagingSlide extends AbstractSlide {
  public constructor() {
    super("You can navigate through the pages using the arrows");
  }

  public render() {
    return svg`
      ${importSprites(gridTile, decisionButtons, progressBar, attentionCircle)}

      ${verificationGridSprite()}

      <use href="#decision-buttons" x="65" y="120" />
      <use href="#progress-bar" x="0" y="40" style="--progress: 90px" />

      <use href="#attention-circle" x="-30" y="0" style="--progress: 90px" />
    `;
  }
}
