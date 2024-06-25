export const booleanConverter = (value: string | null): boolean => value !== null && value !== "false";

/**
 * this callback allows the user to define a callback in the attribute
 *
 * @param value - the value of the attribute as a string or a function
 *
 * @example
 * ```html
 * <oe-spectrogram get-page="() => console.log('do something')">
 * </oe-spectrogram>
 * ```
 */
export const callbackConverter = (value: string | ((...params: any) => any)) => {
  if (typeof value === "string") {
    return new Function(value);
  }

  return value;
};
