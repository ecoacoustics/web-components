import { ValidNumber } from "./types/advancedTypes";

export function isPowerOfTwo(value: ValidNumber): boolean {
  // Additionally, any number multiplied by itself cannot be negative.
  // We probably do not need this check if the number bitwise operations are
  // operated on as signed integers, but I have explicitly included this guard
  // to make the code more readable.
  //
  // Note that 1 is considered valid because 2^0 = 1
  if (value <= 0) {
    return false;
  }

  // If the minimum Int32 value (a valid number) is passed into this function,
  // subtracting one will cause an integer underflow.
  // In the case of an underflow, JavaScript returns the value "-Infinity".
  // We therefore assert that the new value has not underflowed to "-Infinity".
  //
  // Note that the TypeScript typing of this function ensures that the number
  // passed in is not Infinity or NaN, so this check is just to guard against
  // underflow infinities in our calculation.
  const subValue = value - 1;
  if (!isFinite(subValue)) {
    console.warn("Encountered integer underflow. Defaulted to non-power of 2.");
    return false;
  }

  // If a number is a power of 2, its bit representation will be 1 followed by
  // n zeros
  // e.g. 1000
  //
  // Therefore, if we subtract one, the binary will carry into ones
  // e.g. 0111
  //
  // Therefore, a bitwise "and" will always have nothing in common.
  return (value & (value - 1)) === 0;
}
