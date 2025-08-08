import { Tag } from "../tag";
import { Decision, DecisionOptions } from "./decision";

/**
 * @description
 * A decision that represents a new tag that has been added to subject
 *
 * @extends Decision
 */
export class Classification extends Decision {
  public constructor(confirmed: DecisionOptions, tag: Tag) {
    super(confirmed, tag);
  }
}
