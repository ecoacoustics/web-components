import { RenderWindow, TwoDSlice } from "./rendering";
import { AudioModel } from "./recordings";
import * as d3 from "d3-scale";

export class UnitConverters {
  public static getRenderWindow(slice: TwoDSlice, audio: AudioModel): RenderWindow {
    return new RenderWindow({
      startOffset: UnitConverters.pixelsToSeconds(audio, slice.x0),
      endOffset: UnitConverters.pixelsToSeconds(audio, slice.x1),
      lowFrequency: UnitConverters.pixelsToHertz(audio, slice.y0),
      highFrequency: UnitConverters.pixelsToHertz(audio, slice.y1),
    });
  }

  public static secondsToPixels(audio: AudioModel, seconds: number): number {
    const time = d3.scaleLinear().domain([0, audio.duration]).range([0, audio.sampleRate]);
    return time(seconds);
  }

  public static hertzToPixels(audio: AudioModel, hertz: number): number {
    //? I might want to use the nyquist frequency here???
    const frequency = d3.scaleLinear().domain([0, audio.sampleRate]).range([0, audio.sampleRate]);
    return frequency(hertz);
  }

  public static pixelsToSeconds(audio: AudioModel, pixels: number): number {
    const time = d3.scaleLinear().domain([0, audio.sampleRate * audio.duration]).range([0, audio.duration]);
    return time(pixels);
  }

  public static pixelsToHertz(audio: AudioModel, pixels: number): number {
    //? I might want to use the nyquist frequency here???
    const frequency = d3.scaleLinear().domain([0, audio.sampleRate]).range([0, audio.sampleRate]);
    return frequency(pixels);
  }

  public static nyquist(audio: AudioModel) {
    return audio.sampleRate / 2;
  }
}
