import { DecisionComponent } from "decision/decision";
import { HtmlSprite } from "./types";
import { html } from "lit";
import { map } from "lit/directives/map.js";
import { VerificationComponent } from "decision/verification/verification";

export function decisionButtonsSprite(decisionButtons: DecisionComponent[]): HtmlSprite {
  return html`<div class="decision-buttons">${map(decisionButtons, (node) => wireframeDecisionButton(node))}</div>`;
}

function wireframeDecisionButton(button: DecisionComponent): Node {
  const clonedNode = button.cloneNode(true) as VerificationComponent;
  clonedNode.classList.add("wireframe");

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
