import { LitElement } from "lit";

/**
 * A callback that will be executed once on first load.
 */
export type ComponentModifier = (component: LitElement) => void;
