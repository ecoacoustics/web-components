import { CSSResultGroup, unsafeCSS } from "lit";

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
