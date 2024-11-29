import { SVGTemplateResult } from "lit";
import { Seconds } from "../../../models/unitConverters";

export abstract class AbstractSlide {
  public abstract play(): void;
  public abstract pause(): void;
  public abstract render(): SVGTemplateResult;

  public get playbackPosition(): Seconds {
    return this._playbackPosition;
  }

  protected _playbackPosition: Seconds = 0;
}
