import { HTMLTemplateResult } from "lit";

export abstract class AbstractSlide {
  public constructor(description: string) {
    this.description = description;
  }

  public description: string;
  public hasAnimations = false;

  public abstract render(): HTMLTemplateResult;
}
