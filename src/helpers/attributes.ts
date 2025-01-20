import { Tag } from "../models/tag";
import { Enum } from "./types/advancedTypes";

const converterNoProvidedFallback = Symbol("converter-no-fallback");

export const booleanConverter = (value: string | null): boolean => value !== null && value !== "false";

export const arrayConverter = <T = unknown>(value: string | null | T[]): T[] => {
  if (Array.isArray(value)) {
    return value;
  } else if (value === null) {
    return [];
  }

  return value.split(",").map((item) => item.trim()) as T[];
};

// TODO: move this to a different place
export const tagArrayConverter = (value: string | null): Tag[] => {
  if (value === null) {
    return [];
  }

  return value.split(",").map((item) => ({ text: item.trim() }));
};

export const tagConverter = (value: string | null): Tag => {
  if (value === null) {
    return { text: "" };
  }

  return { text: value };
};

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
    if (value === "") {
      throw new Error("Empty string is not a valid callback");
    }

    return new Function(value);
  }

  return value;
};

export const enumConverter = <T extends Enum>(
  enumValues: T,
  fallbackValue: keyof T | typeof converterNoProvidedFallback = converterNoProvidedFallback,
) => {
  return (value: string): T[keyof T] | undefined => {
    // we compare the requested key, and the enums keys as lowercase so that
    // the attribute that is exposed to the user is case insensitive
    const lowercaseKey = value.toLowerCase();
    const enumKey = Object.keys(enumValues).find((key) => key.toLowerCase() === lowercaseKey) as keyof T | undefined;

    if (enumKey) {
      return enumValues[enumKey];
    }

    // if we get to this point, the user has provided an incorrect value to the
    // enum attribute, and we should either fall back to the default or
    // throw an error
    //
    // Because noProvidedFallback symbol is not exported from this file, we know
    // that if the fallback is the noProvidedFallback symbol, the user has not
    // provided a fallback to this function.
    // We use a symbol over undefined or any other falsy value because the user
    // might want to use undefined or a falsy value as the fallback value.
    if (fallbackValue === converterNoProvidedFallback) {
      console.error();
    } else {
      // this string type casting is okay because we have checked that it is not
      // a symbol in the if condition above
      console.warn(`'${value}' is not a valid value. Falling back to '${fallbackValue as string}'.`);
      return fallbackValue as any;
    }
  };
};
