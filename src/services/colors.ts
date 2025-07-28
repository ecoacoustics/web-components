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
  const tagColor = tagColors.get(tagName);
  if (tagColor) {
    return `${tagColor}-${decision.confirmed}`;
  }

  const nextColorId = tagColors.size;
  const newDecisionColor: CssVariable = `--${colorNamespace}-${nextColorId}`;
  tagColors.set(tagName, newDecisionColor);

  return `${newDecisionColor}-${decision.confirmed}`;
}
