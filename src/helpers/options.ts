/**
 * @description
 * Merges multiple option objects into a base object while ignoring `undefined`
 * values.
 */
export function mergeOptions<const T>(base: T, ...options: Partial<T>[]): T {
  // We cannot use Object.assign because if the keys value is present and set
  // to "undefined", it will overwrite the base value.
  for (const option of options) {
    for (const [key, value] of Object.entries(option)) {
      if (value !== undefined) {
        base[key] = value;
      }
    }
  }

  return base;
}
