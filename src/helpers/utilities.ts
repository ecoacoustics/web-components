import { Seconds } from "../models/unitConverters";

export function sleep(seconds: Seconds) {
  const milliseconds = secondsToMilliseconds(seconds);
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function secondsToMilliseconds(seconds: number) {
  return seconds * 1000;
}
