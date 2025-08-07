import { unsafeCSS } from "lit";
import colorbrewer from "colorbrewer";

/**
 * Creates a diagonal (45deg) line hatching pattern that can be used in a CSS
 * "background" property.
 *
 * The size & thickness of the lines will be determined by the selected elements
 * font size so that smaller elements (with smaller fonts) can have tighter
 * hatching.
 */
function hatchedBackground(color: string): string {
  return `repeating-linear-gradient(
    45deg,
    ${color} 0em,
    ${color} 0.5em,
    var(--oe-panel-color) 0.5em,
    var(--oe-panel-color) 1em
  )`;
}

function classificationTrueColor(baseColor: string): string {
  return baseColor;
}

function classificationFalseColor(baseColor: string): string {
  // the false color is derived from the colorBrewer color and darkening the
  // color by a percentage
  // this means that the false color is always similar to the base color
  const falseDarkenPercentage = 65;
  return `color-mix(in srgb, ${baseColor} ${falseDarkenPercentage}%, black)`;
}

// We reverse the color brewer Set1 because the first two colors out of this set
// are close to red and green (which we use for true/false).
// I also remove the last color because it is a light grey which has a sematic
// meaning in our design system of a "disabled" state.
//
// Additionally, note that we are using "slice" first which creates a copy of
// the array, so that when we use "reverse" (an in-place operation) it does not
// mutate the libraries array.
const colorBrewerColorSet = colorbrewer.Set1[9].slice(0, -1).reverse();

// Because color brewer is shipped under the Apache license. I don't want to
// export any css variables under the "color-brewer" namespace.
// I've therefore used "unique-color" for the color brewer namespace.
// prettier-ignore
const colorBrewerColors = `
    ${colorBrewerColorSet.map(
      (color: string, i: number) => `
        --unique-color-${i}-true: ${classificationTrueColor(color)};
        --unique-color-${i}-false: ${classificationFalseColor(color)};
      `,
    ).join("")}
`;

const skipColor = "#ddd";
const notRequiredColor = "#ddd";
const unsureColor = "#d0d";

const verificationColors = `
  --verification-true: green;
  --verification-false: red;
  --verification-skip: ${hatchedBackground(skipColor)};
  --verification-unsure: ${hatchedBackground(unsureColor)};
`;

const noDecisionColors = `
  --not-required-color: ${hatchedBackground(notRequiredColor)};
`;

export const decisionColors = unsafeCSS(`
  :host {
    ${verificationColors}
    ${colorBrewerColors}
    ${noDecisionColors}
  }
`);
