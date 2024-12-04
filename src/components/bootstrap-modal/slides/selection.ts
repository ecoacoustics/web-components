import { AbstractSlide } from "./abstractSlide";
import { svg } from "lit";

export class SelectionSlide extends AbstractSlide {
  public constructor() {
    super("You can decide about more than one subject at once");
  }

  public render() {
    return svg``;
  }
}
