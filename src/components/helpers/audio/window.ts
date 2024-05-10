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

type WindowFunction = (array: number[], alpha?: number | undefined) => number[];

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
