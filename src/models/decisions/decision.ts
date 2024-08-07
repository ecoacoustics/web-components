import { EnumValue } from "../../helpers/advancedTypes";
import { Tag } from "../tag";

/**
 * A one-to-many relationship which can be used to identify if a decision
 * is the same as another
 */
export type DecisionId = Readonly<number>;

/** The decision states that can be applied to a tag */
export enum DecisionOptions {
  FALSE = "false",
  TRUE = "true",
  UNSURE = "unsure",
  SKIP = "skip",
}

/**
 * @description
 * A polymorphic structure that can be used to represent any decision type
 * that implements the abstract class
 */
export class Decision {
  public constructor(confirmed: EnumValue<DecisionOptions>, decisionId: DecisionId, tag?: Tag) {
    this.confirmed = confirmed;
    this.decisionId = decisionId;
    this.tag = tag ?? { text: "" };
  }

  /** Stores the decision outcome */
  public confirmed: EnumValue<DecisionOptions>;

  /** A reference to group the same decisions */
  public decisionId: DecisionId;

  /** A tag that the decision was made about */
  public tag: Tag;
}
