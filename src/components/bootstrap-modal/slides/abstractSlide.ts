import { HTMLTemplateResult } from "lit";

export abstract class AbstractSlide {
  public constructor(title: string) {
    this.title = title;
  }

  public title: string;

  public abstract render(): HTMLTemplateResult;
}
