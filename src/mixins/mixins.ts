import { LitElement } from "lit";

export type Component = ImplementsConstructor<LitElement>;

type ImplementsConstructor<T> = new (...args: any[]) => T;
