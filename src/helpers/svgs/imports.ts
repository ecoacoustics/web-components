import { svg, SVGTemplateResult } from "lit";
import { map } from "lit/directives/map.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";

// TODO: we might be able to make this a static template to improve performance
export function importSprites(...sources: string[]): SVGTemplateResult {
  return svg`
    ${map(sources, (source) => unsafeSVG(source))}
  `;
}
