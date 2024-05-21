import { html, LitElement, PropertyValueMap, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { decisionStyles } from "./css/style";

type ShortcutCallback = (event: KeyboardEvent) => void;

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

  private shortcutCallback: ShortcutCallback = () => void 0;

  protected update(changedProperties: PropertyValueMap<this>): void {
    if (changedProperties.has("shortcut")) {
      const key = changedProperties.get("shortcut");
      this.shortcutCallback = this.createShortcutCallback(key);
    }
  }

  // protected shouldUpdate(changedProperties: PropertyValues): boolean {
  //   const excludedProperties: (keyof this)[] = ["shortcut"];
  //   return excludedProperties.some((key) => changedProperties.has(key));
  // }

  protected firstUpdated(): void {
    document.addEventListener("keydown", this.shortcutCallback);
  }

  private emitDecision(): void {
    // I focus on the button clicked with keyboard shortcuts
    // so that the user gets some visual feedback on what button they clicked
    // it also mimics the user clicking on the button where it would be focused
    // after clicking
    this.decisionButton.focus();

    this.dispatchEvent(
      new CustomEvent("decision", {
        detail: {
          value: this.value,
          additionalTags: this.additionalTags,
        },
        bubbles: true,
      }),
    );
  }

  private createShortcutCallback(key: string | undefined): ShortcutCallback {
    if (key === undefined) {
      return () => void 0;
    }

    return (event: KeyboardEvent) => {
      if (event.key.toLocaleLowerCase() === key.toLocaleLowerCase()) {
        this.emitDecision();
      }
    };
  }

  public render() {
    return html`
      <button
        id="decision-button"
        @click="${this.emitDecision}"
        part="decision-button"
        title="Shortcut: ${this.shortcut}"
      >
        <slot></slot>
      </button>
    `;
  }
}
