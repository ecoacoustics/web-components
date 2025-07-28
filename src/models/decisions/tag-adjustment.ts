import { Tag } from "../tag";
import { Decision, DecisionOptions } from "./decision";

/**
 * @description
 * A decision that represents that the tag is incorrect and should be changed.
 *
 * @extends Decision
 */
export class TagAdjustment extends Decision {
  public constructor(tag: Tag) {
    super(DecisionOptions.TRUE, tag);
  }
}
