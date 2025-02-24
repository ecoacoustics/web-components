import { Tag } from "../models/tag";
import { Enum } from "./types/advancedTypes";

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

export const enumConverter = <T extends Enum>(enumValues: T) => {
  return (value: string): T[keyof T] | undefined => {
    // we compare the requested key, and the enums keys as lowercase so that
    // the attribute that is exposed to the user is case insensitive
    const lowercaseKey = value.toLowerCase();
    const enumKey = Object.keys(enumValues).find((key) => key.toLowerCase() === lowercaseKey) as keyof T | undefined;

    if (enumKey) {
      return enumValues[enumKey];
    }
  };
};
