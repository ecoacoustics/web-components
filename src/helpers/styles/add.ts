import { CSSResultGroup, CSSResultOrNative, LitElement } from "lit";

export function addStyleSheets(component: LitElement, styles: CSSResultGroup): void {
  if (Array.isArray(styles)) {
    for (const style of styles) {
      if (Array.isArray(style)) {
        addStyleSheets(component, style);
      } else {
        addStyleSheet(component, style);
      }
    }

    return;
  }

  addStyleSheet(component, styles);
}

function addStyleSheet(component: LitElement, styles: CSSResultOrNative): void {
  if (styles instanceof CSSStyleSheet) {
    component.shadowRoot?.adoptedStyleSheets.push(styles);
  } else {
    const resultStyleSheet = styles.styleSheet;
    if (!resultStyleSheet) {
      console.warn("No styleSheet found in CSSResult", styles);
      return;
    }

    component.shadowRoot?.adoptedStyleSheets.push(styles.styleSheet);
  }
}
