import { LitElement } from "lit";

// the object union here is a workaround for a TypeScript bug where the compiler
// doesn't support generic types for mixins
// by using a union with an object, we can successfully dereference the type
// see: https://github.com/microsoft/TypeScript/issues/16390
// see: https://github.com/microsoft/TypeScript/issues/37142
export type Component = new (...args: any[]) => LitElement & object;
