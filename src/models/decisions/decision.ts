import { Tag } from "../tag";

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
  public constructor(confirmed: DecisionOptions, tag?: Tag) {
    this.confirmed = confirmed;
    this.tag = tag ?? { text: "" };
  }

  /** Stores the decision outcome */
  public readonly confirmed: DecisionOptions;

  /** A tag that the decision was made about */
  public readonly tag: Tag;
}
