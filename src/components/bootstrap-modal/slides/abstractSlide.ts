import { HTMLTemplateResult } from "lit";

export abstract class AbstractSlide {
  public constructor(title: string, description: string) {
    this.title = title;
    this.description = description;
  }

  public title: string;
  public description: string;

  public abstract render(): HTMLTemplateResult;
}
