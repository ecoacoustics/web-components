import { EnumValue } from "../../helpers/types/advancedTypes";
import { Tag } from "../tag";
import { Decision, DecisionOptions } from "./decision";

/**
 * @description
 * A decision that verifies or denies the existence of a tag in a subjects
 * audio segment
 *
 * @extends Decision
 */
export class Verification extends Decision {
  public constructor(confirmed: EnumValue<DecisionOptions>, tag?: Tag) {
    super(confirmed, tag);
  }

  /** returns a new verification instance with the tag property changed */
  public withTag(tag: Tag): Verification {
    // we return a new instance of the verification model instead of mutating
    // the original tag model because Verification models are shared between
    // all descendants of a creator
    // by returning a new instance, we can ensure that the original shared
    // instance is not updated with the changed tag
    return new Verification(this.confirmed, tag);
  }
}
