import { ValidNumber } from "./types/advancedTypes";

/**
 * A type guard that can be used to remove the NaN and Infinity from a number
 */
export function isValidNumber(value: number): value is ValidNumber {
  if (!isFinite(value) || isNaN(value)) {
    return false;
  }

  return true;
}
