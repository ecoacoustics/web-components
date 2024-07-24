import { customElement } from "lit/decorators.js";
import { Classification } from "../../../models/decisions/classification";
import { Verification } from "../../../models/decisions/verification";
import { DecisionComponent } from "..//decision";

/**
 * @description
 * A decision that when made will emit a Verification model
 *
 * @slot - The text/content of the decision
 *
 * @csspart decision-button - The button that triggers the decision
 *
 * @fires decision
 */
@customElement("oe-verification")
export class VerificationComponent extends DecisionComponent {
  public override generateDecisionModels(): [Verification, ...Classification[]] {
    const verification = new Verification(this.verified, this.decisionId);

    const classifications: Classification[] = [];
    for (const additionalTag of this.additionalTags) {
      const classification = new Classification(this.verified, this.decisionId, additionalTag);
      classifications.push(classification);
    }

    return [verification, ...classifications];
  }
}
