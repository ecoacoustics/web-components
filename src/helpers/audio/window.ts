import {
  blackman,
  blackman_harris,
  blackman_nuttall,
  cosine,
  exact_blackman,
  flat_top,
  gaussian,
  hamming,
  hann,
  kaiser,
  lanczos,
  nuttall,
  tukey,
  WindowFunctionName,
} from "fft-windowing-ts";

type WindowFunction = (array: number[], alpha?: number) => number[];

export const windowFunctions: Map<WindowFunctionName, WindowFunction> = new Map([
  ["hann", hann as WindowFunction],
  ["hamming", hamming],
  ["cosine", cosine],
  ["lanczos", lanczos],
  ["gaussian", gaussian],
  ["tukey", tukey],
  ["blackman", blackman],
  ["exact_blackman", exact_blackman],
  ["kaiser", kaiser],
  ["nuttall", nuttall],
  ["blackman_harris", blackman_harris],
  ["blackman_nuttall", blackman_nuttall],
  ["flat_top", flat_top],
]);

export type SmoothingFunction = (array: Float32Array) => Float32Array;

export function resolveSmoother(windowType: WindowFunctionName = "hann"): SmoothingFunction {
  const windowFunction = windowFunctions.get(windowType) ?? hann;
  return (input) => windowFunction(input as any) as unknown as Float32Array;
}

export function estimateSmootherAttenuation(windowType: WindowFunctionName = "hann", windowSize: number): number {
  const windowFunction = windowFunctions.get(windowType) ?? hann;

  // use Array.from instead of the array constructor to make this code clearer
  // https://google.github.io/styleguide/tsguide.html#array-constructor
  const initialWindow = Array.from<number>({ length: windowSize }).fill(1);
  const window = windowFunction(initialWindow);

  const sum = window.reduce((acc, val) => acc + val, 0);
  return sum / window.length;
}
