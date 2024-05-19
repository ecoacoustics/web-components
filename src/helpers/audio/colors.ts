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
export type ColorScaler = (intensity: number) => RgbTuple;

const rgbMaxValue = 255 as const;

function intensityToIndex(intensity: number) {
  if (intensity < 0) {
    return 0;
  } else if (intensity > 1) {
    return rgbMaxValue;
  } else if (Number.isNaN(intensity)) {
    return 0;
  }

  return Math.round(intensity * rgbMaxValue);
}

function precomputedRgb(scheme: IntensityTuple[], intensity: number): RgbTuple {
  const index = intensityToIndex(intensity);
  const color = scheme[index];

  return [color[0] * rgbMaxValue, color[1] * rgbMaxValue, color[2] * rgbMaxValue];
}

function makeScaler(closedScaler: Scale): ColorScaler {
  return (i) => closedScaler(i).rgb();
}

const roseusScale = precomputedRgb.bind(null, roseus);
const viridisScale = precomputedRgb.bind(null, viridisColorScheme);
const turboScale = precomputedRgb.bind(null, turboColorScheme);
const plasmaScale = precomputedRgb.bind(null, plasmaColorScheme);
const infernoScale = precomputedRgb.bind(null, infernoColorScheme);
const magmaScale = precomputedRgb.bind(null, magmaColorScheme);
const cubeHelixScale = makeScaler(chroma.cubehelix().scale());
const gammaIIScale = makeScaler(chroma.scale(gammaIIColorScheme.map((a) => chroma.rgb(a[0], a[1], a[2]))).mode("lab"));
const jetScale = makeScaler(
  chroma.scale(jetColorScheme.map((a) => chroma.rgb(a[0] * 255, a[1] * 255, a[2] * 255))).mode("lrgb"),
);

export const translationTable: Record<string, string | ColorScaler> = {
  grayscale: "Greys",
  blue: "Blues",
  green: "Greens",
  orange: "Oranges",
  purple: "Purples",
  red: "Reds",
  audacity: roseusScale,
  roseus: roseusScale,
  viridis: viridisScale,
  turbo: turboScale,
  plasma: plasmaScale,
  inferno: infernoScale,
  magma: magmaScale,
  cubeHelix: cubeHelixScale,
  gammaII: gammaIIScale,
  jet: jetScale,
  raven: jetScale,
};

export type ColorMapName = keyof typeof translationTable;

export function getColorScale(name: ColorMapName): ColorScaler {
  let scaler = translationTable[name];

  if (scaler === undefined) {
    console.warn("Could not find color scale", name);
    scaler = translationTable.grayscale;
  }

  // if scaler is a string, it's a chroma scale
  if (typeof scaler === "string") {
    return makeScaler(chroma.scale(scaler));
  }

  return scaler;
}
