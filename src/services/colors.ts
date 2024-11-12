import { CssVariable } from "../helpers/types/advancedTypes";
import { Decision, DecisionKind } from "../models/decisions/decision";

const tagColors = new Map<string, CssVariable>();

export function decisionColor(decision: Decision): CssVariable {
  const isVerification = decision.kind === DecisionKind.VERIFICATION;
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
