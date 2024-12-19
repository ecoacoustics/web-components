import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridPageSprite } from "../../sprites/verification-grid.sprite";
import { selectionBoxSprite } from "../../sprites/selection-box.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";

export class SelectionSlide extends AbstractSlide {
  public constructor() {
    super("You can decide about more than one subject at once");
  }

  public render() {
    return html`
      <div class="selection-slide slide">
        <svg viewBox="0 0 280 130">
          <g>${verificationGridPageSprite()}</g>
          ${cursorSprite(223, 96)} ${selectionBoxSprite()}>
        </svg>
      </div>
    `;
  }
}
