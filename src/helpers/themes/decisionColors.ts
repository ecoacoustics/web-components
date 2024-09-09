import { unsafeCSS } from "lit";
import colorbrewer from "colorbrewer";

function classificationTrueColor(baseColor: string): Readonly<string> {
  return baseColor;
}

function classificationFalseColor(baseColor: string): Readonly<string> {
  // the false color is derived from the colorBrewer color and darkening the
  // color by a percentage
  // this means that the false color is always similar to the base color
  const falseDarkenPercentage = 65 as const;
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

const verificationColors = `
  --verification-true: green;
  --verification-false: red;
`;

export const decisionColors = unsafeCSS(`
  :host {
    ${verificationColors}
    ${classificationColors}
  }
`);
