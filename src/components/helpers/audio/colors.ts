import * as d3 from "d3";

type ColorFunction = (t: number) => string;

// TODO: find a more elegant way to do this
export const colorScales: Map<string, ColorFunction> = new Map([
    ["blue", d3.interpolateBlues],
    ["green", d3.interpolateGreens],
    ["grayscale", d3.interpolateGreys],
    ["orange", d3.interpolateOranges],
    ["purple", d3.interpolatePurples],
    ["red", d3.interpolateReds],
    ["turbo", d3.interpolateTurbo],
    ["viridis", d3.interpolateViridis],
    ["inferno", d3.interpolateInferno],
    ["magma", d3.interpolateMagma],
    ["plasma", d3.interpolatePlasma],
    ["cividis", d3.interpolateCividis],
    ["warm", d3.interpolateWarm],
    ["cool", d3.interpolateCool],
    ["cool", d3.interpolateCool],
    ["cubehelix", d3.interpolateCubehelixDefault],
])

export function getColorFunction(name: string) {
  const colorScale = colorScales.get(name)!;
  return d3.scaleSequential(colorScale);
}
