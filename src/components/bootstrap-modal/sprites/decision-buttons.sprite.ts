import { DecisionComponent } from "decision/decision";
import { HtmlSprite } from "./types";
import { html } from "lit";
import { map } from "lit/directives/map.js";
import { VerificationComponent } from "decision/verification/verification";

export function decisionButtonsSprite(decisionButtons: DecisionComponent[]): HtmlSprite {
  return html`<div class="decision-buttons">
    ${map(decisionButtons, (node, i) => wireframeDecisionButton(node, i))}
  </div>`;
}

function wireframeDecisionButton(button: DecisionComponent, index: number): Node {
  const clonedNode = button.cloneNode(true) as VerificationComponent;

  // "wireframe" is a helper class defined in our global styles
  clonedNode.classList.add("wireframe");
  clonedNode.classList.add(`decision-button`);
  clonedNode.classList.add(`decision-button-${index}`);

  // We disable pointer events so that clicking on the decision buttons does not
  // emit a "decision" event.
  // removing pointer events also removes the pointer cursor, which clearly
  // indicates that the buttons are non-functional.
  //
  // the verification grid should stop the propagation of decision events if the
  // bootstrap modal is open, but we don't want to depend on this behavior
  // as a defense in depth measure.
  clonedNode.style.pointerEvents = "none";

  // we set the buttons to their mobile state which makes them simpler such as
  // removing the shortcut keys
  // we do this to not overload the user with information in the help dialog
  clonedNode.isMobile = true;

  // clearly indicate to screen readers that the buttons are disabled.
  // we indicate that the buttons are not disabled to non-screen reader users
  // by changing the buttons into a wireframe representation.
  clonedNode.ariaDisabled = "true";

  return clonedNode;
}
