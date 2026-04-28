import { customElement as litCustomElement } from "lit/decorators.js";

/**
 * @description
 * A call-through to the Lit `@customElement` decorator that also adds component
 * information such as the tag name as a static property on the class.
 */
export function customElement(tagName: string) {
  return (target: any) => {
    litCustomElement(tagName)(target);
    target["tagName"] = tagName;
  };
}
