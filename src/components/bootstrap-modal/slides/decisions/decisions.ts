import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridPageSprite } from "../../sprites/verification-grid.sprite";
import { decisionButtonSprite } from "../../sprites/decision-buttons.sprite";
import { DecisionComponent } from "decision/decision";
import { cursorSprite } from "../../sprites/cursor.sprite";
import { ClassificationComponent } from "../../../decision/classification/classification";

export class DecisionsSlide extends AbstractSlide {
  public constructor(
    hasVerificationTask: boolean,
    hasClassificationTask: boolean,
    demoDecisionButton: DecisionComponent,
  ) {
    let description = "";
    if (hasVerificationTask && hasClassificationTask) {
      description = "This grid contains both verification and classification tasks";
    } else if (hasVerificationTask) {
      description = "This grid contains a verification task";
    } else if (hasClassificationTask) {
      description = "This grid contains a classification task";
    } else {
      console.warn("Could not determine the type of task in the grid. Falling back to verification task prompt.");
      description = "This grid contains a verification task";
    }

    super(description);

    this.demoDecisionButton = demoDecisionButton;
    // this.hasClassificationTask = hasClassificationTask;
    this.hasClassificationTask = this.demoDecisionButton instanceof ClassificationComponent;
  }

  private demoDecisionButton: DecisionComponent;
  private hasClassificationTask: boolean;

  public positiveDecisionColor(): string {
    return this.hasClassificationTask ? "red" : "green";
  }

  public negativeDecisionColor(): string {
    return this.hasClassificationTask ? "maroon" : "red";
  }

  public render() {
    return html`
      <div class="decisions-slide slide">
        <svg viewBox="0 0 280 180">
          <g
            class="pages"
            style="
              --positive-color: ${this.positiveDecisionColor()};
              --negative-color: ${this.negativeDecisionColor()}
            "
          >
            <g class="current-page">${verificationGridPageSprite(this.hasClassificationTask)}</g>
            <g class="next-page">${verificationGridPageSprite(this.hasClassificationTask)}</g>
          </g>

          ${decisionButtonSprite(130, 140, this.demoDecisionButton)}

          <!--
            I purposely place the cursors pointer tip low in the decision
            buttons so that you can see all of the decision buttons content.
          -->
          ${cursorSprite(153, 155)}
        </svg>
      </div>
    `;
  }
}
