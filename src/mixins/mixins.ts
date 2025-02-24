import { LitElement } from "lit";

export type Component = new (...args: any[]) => LitElement;
