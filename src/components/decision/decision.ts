import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { decisionStyles } from "./css/style";

/**
 * A decision that can be made either with keyboard shortcuts or by clicking
 * on the element
 *
 * @property value - The value of the decision
 * @property shortcut - The keyboard shortcut to trigger the decision
 * @property additional-tags - Additional tags to add to the decision
 *
 * @csspart decision-button - The button that triggers the decision
 *
 * @slot - The content of the decision
 */
@customElement("oe-decision")
export class Decision extends AbstractComponent(LitElement) {
  public static styles = decisionStyles;

  @property({ type: String, reflect: true })
  public value: string | undefined;

  @property({ type: String, reflect: true })
  public shortcut: string | undefined;

  @property({ attribute: "additional-tags", type: String, reflect: true })
  public additionalTags: string | undefined;

  @query("#decision-button")
  private decisionButton!: HTMLButtonElement;

  private emitDecision(): void {
    this.decisionButton.classList.add("hover");

    this.dispatchEvent(
      new CustomEvent("decision", {
        detail: {
          value: this.value,
          additionalTags: this.additionalTags,
        },
        bubbles: true,
        composed: true,
      }),
    );

    setTimeout(() => this.decisionButton.classList.remove("hover"), 200);
  }

  public render() {
    if (this.shortcut) {
      document.addEventListener("keydown", (event) => {
        if (event.key === this.shortcut || event.key === this.shortcut?.toLowerCase()) {
          this.emitDecision();
        }
      });
    }

    return html`
      <button
        id="decision-button"
        @click="${() => this.emitDecision()}"
        part="decision-button"
        title="Shortcut: ${this.shortcut}"
      >
        <slot></slot>
      </button>
    `;
  }
}
