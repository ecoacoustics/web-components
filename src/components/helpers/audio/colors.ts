import chroma, { Scale } from "chroma-js";
import { roseus } from "./colors/roseus";
import { magmaColorScheme } from "./colors/magma";
import { infernoColorScheme } from "./colors/inferno";
import { plasmaColorScheme } from "./colors/plasma";
import { turboColorScheme } from "./colors/turbo";
import { viridisColorScheme } from "./colors/viridis";
import { gammaIIColorScheme } from "./colors/gammaII";
import { jetColorScheme } from "./colors/jet";

export type RgbTuple = [r: number, g: number, b: number];
export type IntensityTuple = [ri: number, gi: number, bi: number];
type ColorScaler = (intensity: number) => RgbTuple;

const rgbMaxValue = 255 as const;

function precomputedRgb(scheme: IntensityTuple[]): ColorScaler {
  return (intensity: number): RgbTuple => {
    const index = Math.floor(intensity * rgbMaxValue);
    const color = scheme[index];

    return color.map((x) => x * rgbMaxValue);
  };
}

function makeScaler(closedScaler: Scale): ColorScaler {
  return (i) => closedScaler(i).rgb();
}

const roseusScale = precomputedRgb(roseus);
const viridisScale = precomputedRgb(viridisColorScheme);
const turboScale = precomputedRgb(turboColorScheme);
const plasmaScale = precomputedRgb(plasmaColorScheme);
const infernoScale = precomputedRgb(infernoColorScheme);
const magmaScale = precomputedRgb(magmaColorScheme);
const cubeHelixScale = makeScaler(chroma.cubehelix().scale());
const gammaIIScale = makeScaler(chroma.scale(gammaIIColorScheme.map((a) => chroma.rgb(a[0], a[1], a[2]))).mode("lab"));
const jetScale = makeScaler(
  chroma.scale(jetColorScheme.map((a) => chroma.rgb(a[0] * 255, a[1] * 255, a[2] * 255))).mode("lrgb"),
);

export const translationTable: Record<string, string | (() => ColorScaler)> = {
  grayscale: "Greys",
  blue: "Blues",
  green: "Greens",
  orange: "Oranges",
  purple: "Purples",
  red: "Reds",
  audacity: () => roseusScale,
  roseus: () => roseusScale,
  viridis: () => viridisScale,
  turbo: () => turboScale,
  plasma: () => plasmaScale,
  inferno: () => infernoScale,
  magma: () => magmaScale,
  cubeHelix: () => cubeHelixScale,
  gammaII: () => gammaIIScale,
  jet: () => jetScale,
};

export function getColorScale(name: string): ColorScaler {
  let scaler = translationTable[name];

  if (scaler === undefined) {
    console.warn("Could not find color scale", name);
    scaler = translationTable.grayscale;
  }

  // if scaler is a string, it's a chroma scale
  if (typeof scaler === "string") {
    return makeScaler(chroma.scale(scaler));
  }

  return scaler();
}
