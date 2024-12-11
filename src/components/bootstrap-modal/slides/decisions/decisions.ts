import { AbstractSlide } from "../abstractSlide";
import { svg } from "lit";
import { importSprites } from "../../../../helpers/svgs/imports";
import { verificationGridSprite } from "../../sprites/verification-grid.sprite";
import { decisionButtonsSprite } from "../../sprites/decision-buttons.sprite";
import { Tag } from "../../../../models/tag";
import gridTile from "../../sprites/grid-tile.svg?raw";
import cursorSprite from "../../sprites/cursor.svg?raw";

export class DecisionsSlide extends AbstractSlide {
  public constructor(hasVerificationTask: boolean, classificationTasks: Tag[]) {
    const hasClassificationTask = classificationTasks.length > 0;

    let description = "";
    if (hasVerificationTask && hasClassificationTask) {
      description = "This grid contains both verification and classification tasks";
    } else if (hasVerificationTask) {
      description = "This grid contains a verification task";
    } else if (hasClassificationTask) {
      description = "This grid contains a classification task";
    }
    description = "This grid contains a verification task";

    super(description);

    this.hasVerificationTask = hasVerificationTask;
    this.classificationTasks = classificationTasks;
  }

  private hasVerificationTask: boolean;
  private classificationTasks: Tag[];

  public render() {
    return svg`
      ${importSprites(gridTile, cursorSprite)}

      <g class="decisions-pages">
        <g class="decisions-page-1">${verificationGridSprite()}</g>
        <g class="decisions-page-2">${verificationGridSprite()}</g>
      </g>

      <!-- <use href="#decision-buttons" x="125" y="140" /> -->
      ${decisionButtonsSprite(this.hasVerificationTask, this.classificationTasks)}

      <use class="decisions-cursor" href="#cursor" x="150" y="150" />
    `;
  }
}
