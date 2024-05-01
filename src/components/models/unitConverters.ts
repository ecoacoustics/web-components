import { RenderCanvasSize, RenderWindow } from "./rendering";
import { AudioModel } from "./recordings";
import * as d3Scale from "d3-scale";
import { computed, Signal } from "@lit-labs/preact-signals";

export type Seconds = number;
export type Hertz = number;
export type Pixels = number;
export type Sample = number;

interface IScale {
  temporal: d3Scale.ScaleLinear<number, number, never>;
  frequency: d3Scale.ScaleLinear<number, number, never>;
}

// use we signals in the stateful unit converters so that when one value updates
// all the computed values also update
export class UnitConverter {
  public constructor(
    renderWindow: Signal<RenderWindow>,
    canvasSize: Signal<RenderCanvasSize>,
    audioModel: Signal<AudioModel>,
  ) {
    this.renderWindow = renderWindow;
    this.canvasSize = canvasSize;
    this.audioModel = audioModel;
  }

  public renderWindow: Signal<RenderWindow>;
  public canvasSize: Signal<RenderCanvasSize>;
  public audioModel: Signal<AudioModel>;

  // TODO: The scales constant should be a class property so that when preact
  // diffs the computed signal, it will compare against a value (not a property)
  public renderWindowScale = computed<IScale>(() => {
    const scales: IScale = {
      temporal: d3Scale.scaleLinear(),
      frequency: d3Scale.scaleLinear(),
    };

    scales.temporal = scales.temporal
      .domain([this.renderWindow.value.startOffset, this.renderWindow.value.endOffset])
      .range([0, this.canvasSize.value.width]);

    scales.frequency = scales.frequency.domain([0, this.nyquist()]).range([this.canvasSize.value.height, 0]);

    return scales;
  });

  public segmentToCanvasScale = computed<IScale>(() => {
    const scales: IScale = {
      temporal: d3Scale.scaleLinear(),
      frequency: d3Scale.scaleLinear(),
    };

    scales.temporal = scales.temporal
      .domain([this.renderWindow.value.startOffset, this.renderWindow.value.startOffset + this.audioModel.value.duration])
      .range([0, this.canvasSize.value.width]);

    scales.frequency = scales.frequency
      .domain([0, this.nyquist()])
      .range([this.canvasSize.value.height, 0]);

    return scales;
  });

  public nyquist() {
    return this.audioModel.value.sampleRate / 2;
  }
}
