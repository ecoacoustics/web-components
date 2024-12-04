import { html } from "lit";
import { AbstractSlide } from "./abstractSlide";

export class StartTaskSlide extends AbstractSlide {
  public constructor(hasVerificationTask: boolean, hasClassificationTask: boolean) {
    super("You can start the task by clicking on the start button");

    this.hasVerificationTask = hasVerificationTask;
    this.hasClassificationTask = hasClassificationTask;
  }

  public override isSvg = false;
  private hasVerificationTask: boolean;
  private hasClassificationTask: boolean;

  public render() {
    let startButtonText = "";
    if (this.hasVerificationTask && this.hasClassificationTask) {
      startButtonText = "Start verification and classification";
    } else if (this.hasVerificationTask) {
      startButtonText = "Start verification";
    } else if (this.hasClassificationTask) {
      startButtonText = "Start classification";
    } else {
      startButtonText = "Start Task";
    }

    return html`
      <div class="start-task-slide">
        <button class="oe-btn-primary">${startButtonText}</button>
      </div>
    `;
  }
}
