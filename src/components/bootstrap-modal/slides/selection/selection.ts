import { BootstrapSlide } from "../abstractSlide";
import { html } from "lit";
import { TempAnimalPresenceArray, verificationGridPageSpriteArray } from "../../sprites/verification-grid.sprite";
import { selectionBoxSprite } from "../../sprites/selection-box.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";
import { decisionButtonSprite } from "../../sprites/decision-buttons.sprite";
import { DecisionComponent } from "decision/decision";

// the demo decision button can be undefined if the user creates a verification
// grid with no decision buttons
export function selectionSlide(
  hasClassificationTask: boolean,
  demoDecisionButton: DecisionComponent | undefined,
): BootstrapSlide {
  const description = "You can decide about more than one subject";

  const animalPresence = [true, true, false, true, true, true] satisfies TempAnimalPresenceArray;
  const slideTemplate = html`
    <div class="selection-slide slide">
      <svg viewBox="0 0 280 180">
        <g>${verificationGridPageSpriteArray(hasClassificationTask, animalPresence)}</g>
        ${decisionButtonSprite(120, 140, demoDecisionButton)} ${cursorSprite(163, 96)} ${selectionBoxSprite()}
      </svg>
    </div>
  `;

  return { slideTemplate, description };
}
