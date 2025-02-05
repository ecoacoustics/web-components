import { CSSResultGroup } from "lit";

// we use a lambda function here so that it captures "this" as a context
export const applyStyleSheets = (classConstructor: any, styleSheets: CSSResultGroup) => {
  console.debug(classConstructor, styleSheets);
};
