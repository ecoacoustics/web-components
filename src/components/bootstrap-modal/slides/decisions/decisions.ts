import { BootstrapSlide } from "../bootstrapSlide";
import { html } from "lit";
import { verificationGridPageSprite } from "../../sprites/verification-grid.sprite";
import { decisionButtonSprite } from "../../sprites/decision-buttons.sprite";
import { DecisionComponent } from "decision/decision";
import { cursorSprite } from "../../sprites/cursor.sprite";

// the demo decision button can be undefined if the user creates a verification
// grid with no decision buttons
export function decisionsSlide(
  hasVerificationTask: boolean,
  hasClassificationTask: boolean,
  demoDecisionButton: Readonly<DecisionComponent | undefined>,
): BootstrapSlide {
  let title = "";
  let description = "";

  if (hasVerificationTask && hasClassificationTask) {
    title = "This grid contains both verification and classification tasks";
    description = "Decide if the tag matches the subject and add tags";
  } else if (hasVerificationTask) {
    title = "This grid contains a verification task";
    description = "Decide if the tag matches the subject";
  } else if (hasClassificationTask) {
    title = "This grid contains a classification task";
    description = "Add tags to the subject";
  } else {
    console.warn("Could not determine the type of task in the grid. Falling back to verification task prompt.");
    title = "This grid contains a verification task";
    description = "Decide if the tag matches the subject";
  }

  const slideTemplate = html`
    <div class="decisions-slide slide">
      <svg viewBox="0 0 280 180">
        <g class="pages">
          <g class="current-page">${verificationGridPageSprite(hasClassificationTask, true)}</g>
          <g class="next-page">${verificationGridPageSprite(hasClassificationTask, false)}</g>
          <g class="final-page">${verificationGridPageSprite(hasClassificationTask, true)}</g>
        </g>

        ${decisionButtonSprite(120, 140, demoDecisionButton)}

        <!--
          I purposely place the cursors pointer tip low in the decision
          buttons so that you can see all of the decision buttons content.
        -->
        ${cursorSprite(143, 155)}
      </svg>
    </div>
  `;

  return { slideTemplate, title, description };
}
