import { CSSResultGroup, CSSResultOrNative, LitElement } from "lit";

export function removeStyleSheets(component: LitElement, styleSheets: CSSResultGroup): void {
  if (Array.isArray(styleSheets)) {
    for (const style of styleSheets) {
      if (Array.isArray(style)) {
        removeStyleSheets(component, style);
      } else {
        removeStyleSheet(component, style);
      }
    }
  }
}

function removeStyleSheet(component: LitElement, styles: CSSResultOrNative): void {
  const currentStyles = component.shadowRoot?.adoptedStyleSheets;
  if (!currentStyles) {
    return;
  }

  const styleSheetObject = styles instanceof CSSStyleSheet ? styles : styles.styleSheet;
  if (!styleSheetObject) {
    return;
  }

  const indexToRemove = currentStyles.indexOf(styleSheetObject);
  if (indexToRemove < 0) {
    return;
  }

  component.shadowRoot.adoptedStyleSheets.splice(indexToRemove, 1);
}
