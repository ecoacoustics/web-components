import { HTMLTemplateResult } from "lit";

export abstract class AbstractSlide {
  public constructor(description: string) {
    this.description = description;
  }

  public description: string;

  public abstract render(): HTMLTemplateResult;

  public start(): void {}
}
