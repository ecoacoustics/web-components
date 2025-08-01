import { Tag } from "../tag";
import { Decision, DecisionOptions } from "./decision";

/**
 * @description
 * A decision that represents that the tag is incorrect and should be changed.
 *
 * @extends Decision
 */
export class TagCorrection extends Decision {
  public constructor(tag: Tag) {
    // Because the base "decision" class requires a "booleanish" decision
    // (FALSE, TRUE, SKIP, UNSURE), I use a "dummy" true value for tag
    // corrections.
    //
    // TODO: We should probably make a different base "Decision" class that
    // doesn't require a "booleanish" decision so that we can have improved
    // typing for TagCorrection decisions.
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
