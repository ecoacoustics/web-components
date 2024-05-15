export type TwoDFft = Float32Array[];

// 2D slices are alwyas a subset of an fft spectrogram
export class TwoDSlice<XT extends number, YT extends number> {
  public constructor(data: TwoDSlice<any, any>) {
    this.x0 = data.x0;
    this.x1 = data.x1;
    this.y0 = data.y0;
    this.y1 = data.y1;
  }

  x0: XT;
  x1: YT;
  y0: XT;
  y1: YT;
}

export class SpectrogramModel {
  public constructor(data: SpectrogramModel) {
    this.startOffset = data.startOffset;
    this.endOffset = data.endOffset;
  }

  startOffset: number;
  endOffset: number;
}

interface IRenderWindow {
  startOffset: number;
  endOffset: number;
  lowFrequency: number;
  highFrequency: number;
}

// also consider: SpectrogramRenderSlice
export class RenderWindow implements IRenderWindow {
  public constructor(data: IRenderWindow) {
    this.startOffset = data.startOffset;
    this.endOffset = data.endOffset;
    this.lowFrequency = data.lowFrequency;
    this.highFrequency = data.highFrequency;
  }

  startOffset: number;
  endOffset: number;
  lowFrequency: number;
  highFrequency: number;

  // changes the render window to a DOM representation that can be used in the
  // window="" attribute of the oe-spectrogram component
  // format: x0, y0, x1, y1
  public toDom(): string {
    return `${this.startOffset}, ${this.lowFrequency}, ${this.endOffset}, ${this.highFrequency}`;
  }
}

export interface Size {
  width: number;
  height: number;
}

export class RenderCanvasSize implements Size {
  public constructor(data: RenderCanvasSize) {
    this.width = data.width;
    this.height = data.height;
  }

  width: number;
  height: number;
}
