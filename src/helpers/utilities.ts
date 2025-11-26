import { Milliseconds, Seconds } from "../models/unitConverters";

export function sleep(seconds: Seconds): Promise<void> {
  const milliseconds = secondsToMilliseconds(seconds);
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * @description
 * Converts a "Seconds" value into "Milliseconds".
 * Because we try to use SI units throughout the codebase, you should only call
 * this function when you need to interact with an external API that requires
 * milliseconds (e.g., {@linkcode setTimeout}).
 *
 * @returns seconds * 1,000
 */
export function secondsToMilliseconds(seconds: Seconds): Milliseconds {
  return seconds * 1_000;
}
