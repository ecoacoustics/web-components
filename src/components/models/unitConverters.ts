import { RenderWindow, TwoDSlice } from "./rendering";
import { AudioModel } from "./recordings";

export class UnitConverters {
  public static getRenderWindow(slice: TwoDSlice, audio: AudioModel): RenderWindow {
    return new RenderWindow({
      startOffset: UnitConverters.pixelsToSeconds(audio, slice.x0),
      endOffset: UnitConverters.pixelsToSeconds(audio, slice.x1),
      lowFrequency: UnitConverters.pixelsToHertz(audio, slice.y0),
      highFrequency: UnitConverters.pixelsToHertz(audio, slice.y1),
    });
  }

  public static secondsToPixels(audio: AudioModel, seconds: number): number {}

  public static hertzToPixels(audio: AudioModel, hertz: number): number {}

  public static pixelsToSeconds(audio: AudioModel, pixels: number): number {}

  public static pixelsToHertz(audio: AudioModel, pixels: number): number {}

  public static nyquist(audio: AudioModel) {
    return audio.sampleRate / 2;
  }
}
