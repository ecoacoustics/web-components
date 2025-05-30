import { Hertz, Seconds } from "./unitConverters";

export type TwoDFft = Float32Array[];

export interface Size<T = number> {
  width: T;
  height: T;
}

export interface Rect<T = number> extends Size<T> {
  x: T;
  y: T;
}

// 2D slices are always a subset of an fft spectrogram
export class TwoDSlice<XT extends number, YT extends number> {
  public constructor(data: TwoDSlice<any, any>) {
    this.x0 = data.x0;
    this.x1 = data.x1;
    this.y0 = data.y0;
    this.y1 = data.y1;
  }

  public x0: XT;
  public x1: YT;
  public y0: XT;
  public y1: YT;
}

export class SpectrogramModel {
  public constructor(startOffset: Seconds, endOffset: Seconds) {
    this.startOffset = startOffset;
    this.endOffset = endOffset;
  }

  public startOffset: Seconds;
  public endOffset: Seconds;
}

// also consider: SpectrogramRenderSlice
export class RenderWindow {
  public constructor(startOffset: Seconds, endOffset: Seconds, lowFrequency: Hertz, highFrequency: Hertz) {
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.lowFrequency = lowFrequency;
    this.highFrequency = highFrequency;
  }

  public startOffset: Seconds;
  public endOffset: Seconds;
  public lowFrequency: Hertz;
  public highFrequency: Hertz;

  // changes the render window to a DOM representation that can be used in the
  // window="" attribute of the oe-spectrogram component
  // format: x0, y0, x1, y1
  public toDom(): string {
    return `${this.startOffset}, ${this.lowFrequency}, ${this.endOffset}, ${this.highFrequency}`;
  }
}

export class RenderCanvasSize implements Size {
  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public width: number;
  public height: number;
}
