import { CSSResult, CSSResultGroup, CSSResultOrNative, LitElement } from "lit";

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
  if (styles instanceof CSSResult) {
    const resultStyleSheet = styles.styleSheet;
    if (!resultStyleSheet) {
      console.warn("No styleSheet found in CSSResult", styles);
      return;
    }

    component.shadowRoot?.adoptedStyleSheets.push(styles.styleSheet);
  } else {
    component.shadowRoot?.adoptedStyleSheets.push(styles);
  }
}
