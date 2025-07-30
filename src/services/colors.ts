import { CssVariable } from "../helpers/types/advancedTypes";
import { Classification } from "../models/decisions/classification";
import { Decision } from "../models/decisions/decision";
import { TagAdjustment } from "../models/decisions/tag-adjustment";
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
  const isClassification = decision instanceof Classification;
  if (isClassification) {
    return classificationColor(decision);
  }

  const colorNamespaces = new Map([
    [Verification, "verification"],
    [TagAdjustment, "adjustment"],
  ]);

  const decisionConstructor = Object.getPrototypeOf(decision).constructor;
  const colorNamespace = colorNamespaces.get(decisionConstructor);
  if (!colorNamespace) {
    throw new Error("Could not find color namespace for decision type");
  }

  return `--${colorNamespace}-${decision.confirmed}`;
}

function classificationColor(decision: Classification): CssVariable {
  const tagName = decision.tag?.text ?? decision.tag;
  const tagColor = tagColors.get(tagName);
  if (tagColor) {
    return `${tagColor}-${decision.confirmed}`;
  }

  const nextColorId = tagColors.size;
  const newDecisionColor: CssVariable = `--class-${nextColorId}`;
  tagColors.set(tagName, newDecisionColor);

  return `${newDecisionColor}-${decision.confirmed}`;
}
