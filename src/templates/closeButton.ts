import { html, HTMLTemplateResult } from "lit";

export function closeIconTemplate({ className = "xl-icon" } = {}): HTMLTemplateResult {
  return html`<sl-icon name="x-mark" class="${className}" aria-label="Close"></sl-icon>`;
}
