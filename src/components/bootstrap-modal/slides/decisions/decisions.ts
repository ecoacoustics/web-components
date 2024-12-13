import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { importSprites } from "../../../../helpers/svgs/imports";
import { verificationGridSprite } from "../../sprites/verification-grid.sprite";
import { decisionButtonsSprite } from "../../sprites/decision-buttons.sprite";
import { DecisionComponent } from "decision/decision";
import { cursorSprite } from "../../sprites/cursor.sprite";
import gridTile from "../../sprites/grid-tile.svg?raw";

export class DecisionsSlide extends AbstractSlide {
  public constructor(
    hasVerificationTask: boolean,
    hasClassificationTask: boolean,
    decisionButtons: DecisionComponent[],
  ) {
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

    this.decisionButtons = decisionButtons;
  }

  private decisionButtons: DecisionComponent[];

  public render() {
    return html`
      <div class="decisions-slide html-slide">
        <svg viewBox="0 0 390 230">
          ${importSprites(gridTile)}

          <g class="decisions-pages">
            <g class="decisions-page-current">${verificationGridSprite()}</g>
            <g class="decisions-page-next">${verificationGridSprite()}</g>
          </g>

          ${cursorSprite("decisions-cursor", 160, 150)}
        </svg>

        <div class="decisions-buttons">${decisionButtonsSprite(this.decisionButtons)}</div>
      </div>
    `;
  }
}
