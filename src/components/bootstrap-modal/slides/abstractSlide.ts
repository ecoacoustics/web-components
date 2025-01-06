import { HTMLTemplateResult } from "lit";

export abstract class AbstractSlide {
  public constructor(description: string) {
    this.description = description;
  }

  public description: string;
  public hasAnimations = true;

  // by stopping the animation, the animations time will reset back to the start
  public restart(): void {
    this.stop();
    this.play();
  }

  public abstract play(): void;
  public abstract stop(): void;
  public abstract render(): HTMLTemplateResult;
}
