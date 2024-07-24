import { css, unsafeCSS } from "lit";
import colorbrewer from "colorbrewer";

const colorBrewerColors = colorbrewer.Paired[11];
export const decisionColors = unsafeCSS(`
  ${colorBrewerColors.map((color: string, i: number) => css`
    .decision-${i} {
      --decision-color: ${unsafeCSS(color)};
      --decision-color-${i}: ${unsafeCSS(color)};
    }
  `).join("")}
`);
