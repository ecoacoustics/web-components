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
  public constructor(tag?: Tag) {
    // Because the base "decision" class requires a "booleanish" decision
    // (FALSE, TRUE, SKIP, UNSURE), I use a "dummy" true value for new tags.
    //
    // TODO: We should probably make a different base "Decision" class that
    // doesn't require a "booleanish" decision so that we can have improved
    // typing for NewTag decisions.
    // I originally started mocking this out, but it effected almost every place
    // that uses a "decision" because I'd have to narrow the decision into
    // either having a "booleanish" decision or not.
    // This would be a lot of work, and I deemed that it was not worth the time
    // investment when there is currently only one use case, and I could just
    // use a polymorphic type with dummy values and use the same decision
    // handlers for all decisions.
    super(DecisionOptions.TRUE, tag);
  }
}
