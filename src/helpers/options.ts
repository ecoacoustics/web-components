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
        // We need this "as any" because Object.entries does not preserve the
        // object or key types.
        // TODO: We should fix this correctly by providing an Object.entries
        // polyfill that preserves the types.
        (base as any)[key] = value;
      }
    }
  }

  return base;
}
