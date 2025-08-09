import { DecisionOptions } from "../../../models/decisions/decision";
import { VerificationComponent } from "../../decision/verification/verification";
import { customElement } from "lit/decorators.js";

@customElement("oe-skip")
export class SkipComponent extends VerificationComponent {
  public override verified = DecisionOptions.SKIP;
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-skip": SkipComponent;
  }
}
