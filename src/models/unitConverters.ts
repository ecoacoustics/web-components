import { RenderCanvasSize, RenderWindow } from "./rendering";
import { AudioModel } from "./recordings";
import { scaleLinear, ScaleLinear } from "d3-scale";
import { computed, Signal } from "@lit-labs/preact-signals";

export type Seconds = number;
export type Hertz = number;
export type Pixel = number;
export type Sample = number;

export type TemporalScale = LinearScale;
export type FrequencyScale = LinearScale;
type LinearScale = ScaleLinear<number, number, never>;

export interface IScale {
  temporal: LinearScale;
  frequency: LinearScale;
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

  public nyquist = computed(() =>
    this.audioModel.value.sampleRate / 2
  );

  // TODO: The scales constant should be a class property so that when preact
  // diffs the computed signal, it will compare against a value (not a property)
  public renderWindowScale = computed<IScale>(() => {
    const scales: IScale = {
      temporal: scaleLinear(),
      frequency: scaleLinear(),
    };

    scales.temporal = scales.temporal
      .domain([this.renderWindow.value.startOffset, this.renderWindow.value.endOffset])
      .range([0, this.canvasSize.value.width]);

    scales.frequency = scales.frequency
      .domain([0, this.nyquist.value])
      .range([this.canvasSize.value.height, 0]);

    return scales;
  });
}
