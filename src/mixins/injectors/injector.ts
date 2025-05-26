import { LitElement } from "lit";

/**
  * A callback that can modify a component
  */
export type Injector = (component: LitElement) => void;
