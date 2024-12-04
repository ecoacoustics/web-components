import { HTMLTemplateResult, SVGTemplateResult } from "lit";

export abstract class AbstractSlide {
  public constructor(description: string) {
    this.description = description;
  }

  public description: string;
  public isSvg = true;

  public abstract render(): SVGTemplateResult | HTMLTemplateResult;
}
