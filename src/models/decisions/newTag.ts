import { Tag } from "../tag";
import { Decision, DecisionOptions } from "./decision";

/**
 * @description
 * A decision that represents that a new tag should be supplied to a subject.
 * This can be used to correct an incorrectly tagged annotation.
 *
 * @extends Decision
 */
export class NewTag extends Decision {
  public constructor(decision: DecisionOptions, tag: Tag | null) {
    super(decision, tag);
  }
}
