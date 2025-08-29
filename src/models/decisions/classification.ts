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

    this.tag = tag;
  }

  // When creating a classification decision, we know it ahead of time.
  // Unlike a verification or newTag decision, it does not depend on the
  // subject's tag column, meaning that we can safely assume that
  // the tag is always defined.
  public override tag: Tag;
}
