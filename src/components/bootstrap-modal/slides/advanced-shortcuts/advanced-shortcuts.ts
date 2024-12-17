import { html } from "lit";
import { AbstractSlide } from "../abstractSlide";

export class AdvancedShortcutsSlide extends AbstractSlide {
  public constructor() {
    super("Advanced shortcuts slide");
  }

  public render() {
    return html`<button class="oe-btn-secondary">Show tutorial modal</button>`;
  }
}
