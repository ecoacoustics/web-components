import { Decision, TagDecision } from "./decision";

export type DecisionNotRequired = typeof decisionNotRequired;
export type OptionalDecision<T extends TagDecision = Decision> = T | DecisionNotRequired;

export const decisionNotRequired = Symbol("decision-not-required");
