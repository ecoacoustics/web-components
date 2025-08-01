import { Decision } from "./decision";

export type DecisionNotRequired = typeof decisionNotRequired;
export type OptionalDecision<T extends Decision = Decision> = T | DecisionNotRequired;

export const decisionNotRequired = Symbol("decision-not-required");
