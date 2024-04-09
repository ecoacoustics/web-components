import { RenderCanvasSize, RenderWindow, TwoDSlice } from "./rendering";
import { AudioModel, AudioSegment } from "./recordings";
import * as d3Scale from "d3-scale";

export type Seconds = number;
export type Hertz = number;
export type Pixels = number;

export class UnitConverters {
  public static getRenderWindow(scale: Scales, slice: TwoDSlice<number, number>): RenderWindow {
    return new RenderWindow({
      startOffset: UnitConverters.pixelsToSeconds(scale, slice.x0),
      endOffset: UnitConverters.pixelsToSeconds(scale, slice.x1),
      lowFrequency: UnitConverters.pixelsToHertz(scale, slice.y0),
      highFrequency: UnitConverters.pixelsToHertz(scale, slice.y1),
    });
  }

  public static secondsToPixels(scale: Scales, seconds: Seconds): Pixels {
    return scale.temporal(seconds);
  }

  public static pixelsToSeconds(scale: Scales, pixels: Pixels): Seconds {
    return scale.temporal.invert(pixels);
  }

  public static hertzToPixels(scale: Scales, hertz: Hertz): Pixels {
    return scale.frequency(hertz);
  }

  public static pixelsToHertz(scale: Scales, pixels: Pixels): Hertz {
    return scale.frequency.invert(pixels);
  }

  public static nyquist(audio: AudioModel) {
    return audio.sampleRate / 2;
  }
}

export class Scales {
  public constructor() {}

  public temporal!: d3Scale.ScaleLinear<number, number, never>;
  public frequency!: d3Scale.ScaleLinear<number, number, never>;

  // TODO: we need to work out how the render window interacts with this
  // we will probably need additional scales that are not limited to a render windows range
  public renderWindowScale(audioModel: AudioModel, audioSegment: AudioSegment, canvas: RenderCanvasSize): Scales {
    const scales = new Scales();

    scales.temporal = d3Scale
      .scaleLinear()
      .domain([audioSegment.startOffset, audioSegment.startOffset + audioModel.duration])
      .range([0, canvas.width]);

    scales.frequency = d3Scale
      .scaleLinear()
      .domain([0, UnitConverters.nyquist(audioModel)])
      .range([0, canvas.height]);

    return scales;
  }

  public fractionalScale(renderWindow: RenderWindow) {
    const scales = new Scales();

    scales.temporal = d3Scale.scaleLinear().domain([renderWindow.startOffset, renderWindow.endOffset]).range([0, 1]);

    scales.frequency = d3Scale
      .scaleLinear()
      .domain([renderWindow.lowFrequency, renderWindow.highFrequency])
      .range([0, 1]);

    return scales;
  }
}
