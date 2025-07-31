import { unsafeCSS } from "lit";
import colorbrewer from "colorbrewer";

function hashedBackground(color: string): string {
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

const colorBrewerColors = colorbrewer.Set1[9];

// prettier-ignore
const classificationColors = `
    ${colorBrewerColors.map(
      (color: string, i: number) => `
        --class-${i}-true: ${classificationTrueColor(color)};
        --class-${i}-false: ${classificationFalseColor(color)};
      `,
    ).join("")}
`;

const tagPromptColors = `
  --adjustment-true: ${hashedBackground("#dd0")};
  --adjustment-false: ${hashedBackground("#dd0")};
`;

const skipColor = "#ddd";
const unsureColor = "#d0d";

const verificationColors = `
  --verification-true: green;
  --verification-false: red;
  --verification-skip: ${hashedBackground(skipColor)};
  --verification-unsure: ${hashedBackground(unsureColor)};
`;

const noDecisionColors = `
  --not-required-color: #ddd;
`;

export const decisionColors = unsafeCSS(`
  :host {
    ${verificationColors}
    ${classificationColors}
    ${tagPromptColors}
    ${noDecisionColors}
  }
`);
