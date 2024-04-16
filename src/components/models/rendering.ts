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

// also consider: SpectrogramRenderSlice
export class RenderWindow {
  public constructor(data: RenderWindow) {
    this.startOffset = data.startOffset;
    this.endOffset = data.endOffset;
    this.lowFrequency = data.lowFrequency;
    this.highFrequency = data.highFrequency;
  }

  startOffset: number;
  endOffset: number;
  lowFrequency: number;
  highFrequency: number;
}

export class RenderCanvasSize {
  public constructor(data: RenderCanvasSize) {
    this.width = data.width;
    this.height = data.height;
  }

  width: number;
  height: number;
}
