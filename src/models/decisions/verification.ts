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
}
