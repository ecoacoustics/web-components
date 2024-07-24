import { customElement, property } from "lit/decorators.js";
import { tagConverter } from "../../../helpers/attributes";
import { required } from "../../../helpers/decorators";
import { Classification } from "../../../models/decisions/classification";
import { DecisionComponent } from "../decision";
import { Tag } from "../../../models/tag";

/**
 * @description
 * A decision that when made will emit a Classification model
 *
 * @slot - The text/content of the decision
 *
 * @csspart decision-button - The button that triggers the decision
 *
 * @fires decision
 */
@customElement("oe-classification")
export class ClassificationComponent extends DecisionComponent {
  @required()
  @property({ type: String, converter: tagConverter })
  public tag!: Tag;

  public override generateDecisionModels(): [Classification] {
    const classification = new Classification(this.verified, this.decisionId, this.tag);
    return [classification];
  }
}
