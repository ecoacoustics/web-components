import { CSSResultGroup, unsafeCSS } from "lit";

// /**
//  * @description
//  * Injects one or multiple style sheets into a LitElement component.
//  * This can be useful when creating component mixins or abstract components that
//  * extend the LitElement class.
//  */
// export const applyStyleSheets = (
//   classConstructor: Component,
//   styleSheets: string[],
//   currentStyles: CSSResultGroup,
// ): void => {
//   const styles = mergeStyles(styleSheets, currentStyles);
// };

/**
 * @description
 * Merges multiple style sheets into one CSSResultGroup.
 */
export function mergeStyles(stylesheets: string[], currentStyles?: CSSResultGroup): CSSResultGroup {
  let returnedStyles: CSSResultGroup = stylesheets.map((style) => unsafeCSS(style));

  if (Array.isArray(currentStyles)) {
    returnedStyles = [...returnedStyles, ...currentStyles];
  } else if (currentStyles !== undefined) {
    returnedStyles = [...returnedStyles, currentStyles];
  }

  return returnedStyles;
}
