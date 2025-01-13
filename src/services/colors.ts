import { CssVariable } from "../helpers/types/advancedTypes";
import { Decision } from "../models/decisions/decision";
import { Verification } from "../models/decisions/verification";

const tagColors = new Map<string, CssVariable>();

/**
 * @description
 * Fetches the decision color for a decision model.
 * This function has the side effect of registering a new decision color if one
 * does not already exist.
 *
 * @param decision
 */
export function decisionColor(decision: Decision): CssVariable {
  const isVerification = decision instanceof Verification;
  const colorNamespace = isVerification ? "verification" : "class";

  if (isVerification) {
    return `--${colorNamespace}-${decision.confirmed}`;
  }

  const tagName = decision.tag?.text ?? decision.tag;
  if (tagColors.has(tagName)) {
    // because we have already checked that the key exists, we can safely
    // use a TypeScript type override here
    const decisionColor = tagColors.get(tagName) as CssVariable;
    return `${decisionColor}-${decision.confirmed}`;
  }

  const nextColorId = tagColors.size;
  const newDecisionColor: CssVariable = `--${colorNamespace}-${nextColorId}`;
  tagColors.set(tagName, newDecisionColor);

  return `${newDecisionColor}-${decision.confirmed}`;
}
