import { WindowFunctionName } from "fft-windowing-ts";
import { Sample, Hertz } from "../../models/unitConverters";
import { ColorMapName } from "./colors";

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

export interface IAudioInformation {
  startSample: Sample;
  endSample: Sample;
  sampleRate: Hertz;
  channels: number;
  duration: number;
}

export class SpectrogramOptions {
  constructor(
    windowSize: PowerTwoWindowSize,
    windowOverlap: number,
    windowFunction: WindowFunctionName,
    melScale: boolean,
    brightness: number,
    contrast: number,
    colorMap: ColorMapName,
  ) {
    this.windowSize = windowSize;
    this.windowOverlap = windowOverlap;
    this.windowFunction = windowFunction;
    this.melScale = melScale;
    this.brightness = brightness;
    this.contrast = contrast;
    this.colorMap = colorMap;
  }

  /**
   * number of samples in each window for the fft
   * must be a power of 2
   */
  public windowSize: PowerTwoWindowSize;
  /** number of samples to overlap between windows */
  public windowOverlap: number;
  public windowFunction: WindowFunctionName;
  public melScale: boolean;
  public brightness: number;
  public contrast: number;
  public colorMap: ColorMapName;

  public get windowStep(): number {
    return this.windowSize - this.windowOverlap;
  }
}
