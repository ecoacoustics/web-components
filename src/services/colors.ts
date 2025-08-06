import { Constructor, CssVariable } from "../helpers/types/advancedTypes";
import { Classification } from "../models/decisions/classification";
import { Decision } from "../models/decisions/decision";
import { decisionNotRequired, OptionalDecision } from "../models/decisions/decisionNotRequired";
import { NewTag } from "../models/decisions/newTag";
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
export function decisionColor(decision: OptionalDecision): CssVariable {
  if (decision === decisionNotRequired) {
    return notRequiredColor();
  }

  const colorBrewerDecisions = new Set([Classification, NewTag]);
  if (colorBrewerDecisions.has(Object.getPrototypeOf(decision).constructor)) {
    return colorBrewerColor(decision);
  }

  const colorNamespaces = new Map<Constructor<Decision>, string>([[Verification, "verification"]]);

  const decisionConstructor = Object.getPrototypeOf(decision).constructor;
  const colorNamespace = colorNamespaces.get(decisionConstructor);
  if (!colorNamespace) {
    throw new Error("Could not find color namespace for decision type");
  }

  return `--${colorNamespace}-${decision.confirmed}`;
}

function colorBrewerColor(decision: Decision): CssVariable {
  const tagName = decision.tag?.text ?? decision.tag;
  const tagColor = tagColors.get(tagName);
  if (tagColor) {
    return `${tagColor}-${decision.confirmed}`;
  }

  const nextColorId = tagColors.size;
  const newDecisionColor: CssVariable = `--unique-color-${nextColorId}`;
  tagColors.set(tagName, newDecisionColor);

  return `${newDecisionColor}-${decision.confirmed}`;
}

function notRequiredColor(): CssVariable {
  return "--not-required-color";
}
