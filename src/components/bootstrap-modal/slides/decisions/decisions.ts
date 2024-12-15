import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridPageSprite } from "../../sprites/verification-grid.sprite";
import { decisionButtonsSprite } from "../../sprites/decision-buttons.sprite";
import { DecisionComponent } from "decision/decision";
import { cursorSprite } from "../../sprites/cursor.sprite";

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
      <div class="decisions-slide slide">
        <svg viewBox="0 0 300 230">
          <g class="pages">
            <g class="current-page">${verificationGridPageSprite()}</g>
            <g class="next-page">${verificationGridPageSprite()}</g>
          </g>

          ${cursorSprite(160, 150)}
        </svg>

        <div class="decisions-buttons">${decisionButtonsSprite(this.decisionButtons)}</div>
      </div>
    `;
  }
}
