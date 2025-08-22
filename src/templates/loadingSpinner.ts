import { html, HTMLTemplateResult } from "lit";

// This template uses "em" units meaning that you can change the size of the
// loading spinner by changing the font-size.
export function loadingSpinnerTemplate(): HTMLTemplateResult {
  // I use the inline Element "style" attribute instead of a <style> block so
  // if there are multiple loading spinners on the page, there will be no
  // duplicate style declarations.
  return html`
    <svg
      aria-label="Loading"
      style="
        display: inline-block;
        width: 2em;
        height: 2em;
        border: 0.2em solid transparent;
        border-radius: 100%;
        border-top-color: var(--oe-primary-color);
        animation: spin 1s linear infinite;
      "
    >
      <circle fill="none" />
    </svg>
  `;
}
