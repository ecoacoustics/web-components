import { EnumValue } from "../../helpers/types/advancedTypes";
import { Tag } from "../tag";

/** The decision states that can be applied to a tag */
export enum DecisionOptions {
  FALSE = "false",
  TRUE = "true",
  UNSURE = "unsure",
  SKIP = "skip",
}

export enum DecisionKind {
  VERIFICATION = "verification",
  CLASSIFICATION = "classification",

  /**
   * An unknown decision type.
   * Warning: this type should not be used outside of the AbstractDecision class
   */
  DECISION = "decision",
}

/**
 * @description
 * A polymorphic structure that can be used to represent any decision type
 * that implements the abstract class
 */
export class Decision {
  public constructor(confirmed: EnumValue<DecisionOptions>, tag?: Tag) {
    this.confirmed = confirmed;
    this.tag = tag ?? { text: "" };
  }

  /** What kind of decision this model represents */
  public kind: DecisionKind = DecisionKind.DECISION;

  /** Stores the decision outcome */
  public confirmed: EnumValue<DecisionOptions>;

  /** A tag that the decision was made about */
  public tag: Tag;
}
