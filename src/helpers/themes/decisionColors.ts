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

// I remove the colors for "gray", "red", and "green" from this set because
// they all have semantic meaning in our design language.
// red: indicates a false decision
// green: indicates a true decision
// gray: indicates a disabled state
//
// https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=12
const colorBrewerSetRedIndex = 0;
const colorBrewerSetGreenIndex = 2;
const colorBrewerSetGrayIndex = 8;
const removedColorBrewerIndexes = [colorBrewerSetRedIndex, colorBrewerSetGreenIndex, colorBrewerSetGrayIndex];

const colorBrewerColorSet = colorbrewer.Set1[9].filter(
  (_: string, i: number) => !removedColorBrewerIndexes.includes(i),
);

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
  --verification-unsure: ${hatchedBackground(unsureColor)};
`;

const specialColors = `
  --decision-skip: ${hatchedBackground(skipColor)};
  --not-required-color: ${hatchedBackground(notRequiredColor)};
`;

export const decisionColors = unsafeCSS(`
  :host {
    ${verificationColors}
    ${colorBrewerColors}
    ${specialColors}
  }
`);
