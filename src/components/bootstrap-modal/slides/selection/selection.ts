import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridPageSprite } from "../../sprites/verification-grid.sprite";
import { selectionBoxSprite } from "../../sprites/selection-box.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";
import { decisionButtonSprite } from "../../sprites/decision-buttons.sprite";
import { DecisionComponent } from "decision/decision";
import { ClassificationComponent } from "../../../decision/classification/classification";

export class SelectionSlide extends AbstractSlide {
  public constructor(demoDecisionButton: DecisionComponent) {
    super("You can decide about more than one subject at once");

    this.demoDecisionButton = demoDecisionButton;
    this.hasClassificationTask = this.demoDecisionButton instanceof ClassificationComponent;
  }

  private demoDecisionButton: DecisionComponent;
  private hasClassificationTask: boolean;

  public render() {
    return html`
      <div class="selection-slide slide">
        <svg viewBox="0 0 280 180">
          <g>${verificationGridPageSprite(this.hasClassificationTask)}</g>
          ${decisionButtonSprite(130, 140, this.demoDecisionButton)} ${cursorSprite(163, 96)} ${selectionBoxSprite()}
        </svg>
      </div>
    `;
  }
}
