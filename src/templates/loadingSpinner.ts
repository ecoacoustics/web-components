import { html, HTMLTemplateResult } from "lit";

export function loadingSpinnerTemplate(): HTMLTemplateResult {
  return html`
    <style>
      .loading-spinner {
        display: inline-block;
        width: 2em;
        height: 2em;
        border: 2px solid transparent;
        border-radius: 100%;
        border-top-color: var(--oe-primary-color);
        animation: spin 1s linear infinite;
      }
    </style>

    <svg class="loading-spinner" aria-label="Loading">
      <circle fill="none" />
    </svg>
  `;
}
