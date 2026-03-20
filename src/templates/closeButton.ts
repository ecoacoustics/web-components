import { html, HTMLTemplateResult } from "lit";

export function closeIconTemplate({ className = "xl-icon" } = {}): HTMLTemplateResult {
  return html`<sl-icon name="x-lg" class="${className}" aria-label="Close"></sl-icon>`;
}
