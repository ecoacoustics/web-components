/**
 * Positive powers of two that are commonly used for audio processing.
 * This is useful for autocomplete and type safety when specifying window sizes.
 */
export type PowerTwoWindowSize =
  | 1
  | 2
  | 4
  | 8
  | 16
  | 32
  | 64
  | 128
  | 256
  | 512
  | 1024
  | 2048
  | 4096
  | 8192
  | 16384
  | 32768;

// Unlike the window size, window overlap can be zero, which means no overlap.
export type PowerTwoWindowOverlap = PowerTwoWindowSize | 0;
