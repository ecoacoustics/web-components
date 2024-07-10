import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import decisionStyles from "./css/style.css?inline";
import { classMap } from "lit/directives/class-map.js";
import { SelectionObserverType } from "../verification-grid/verification-grid";
import { booleanConverter, tagArrayConverter, tagConverter } from "../../helpers/attributes";
import { Classification, Tag, VerificationDecision } from "../../models/verification";
import { decisionColors } from "../../helpers/themes/decisionColors";
import { ESCAPE_KEY } from "../../helpers/keyboard";

interface DecisionContent {
  value: Classification[];
  target: DecisionComponent;
}

export type DecisionEvent = CustomEvent<DecisionContent>;

/**
 * @description
 * A decision that can be made either with keyboard shortcuts or by clicking/touching
 * on the element
 *
 * @slot - The text/content of the decision
 *
 * @csspart decision-button - The button that triggers the decision
 *
 * @fires decision
 */
@customElement("oe-decision")
export class DecisionComponent extends AbstractComponent(LitElement) {
  public static styles = [unsafeCSS(decisionStyles), decisionColors];
  public static decisionEventName = "decision" as const;

  /** Value that will be added to the oe-additional-tags column */
  @property({ attribute: "additional-tags", type: Array, converter: tagArrayConverter, reflect: true })
  public additionalTags: Tag[] = [];

  /** Disables the decision button and prevents decision events from firing */
  @property({ attribute: "disabled", type: Boolean, converter: booleanConverter, reflect: true })
  public disabled = false;

  /** A tag which a verification decision is being applied to */
  @property({ type: String, converter: tagConverter, reflect: true })
  public tag?: Tag;

  /** A keyboard key that when pressed will act as a click event on the button */
  @property({ type: String, reflect: true })
  public shortcut?: string;

  /** Clicking the button will verify or reject a tags annotation */
  @property({ type: Boolean, converter: booleanConverter })
  public verified?: boolean;

  /** Adds "SKIP" to the verification column when */
  @property({ type: Boolean, converter: booleanConverter })
  public skip?: boolean;

  /** Adds "UNSURE" to the verification column when downloaded */
  @property({ type: Boolean, converter: booleanConverter })
  public unsure?: boolean;

  @property({ attribute: false, type: Boolean })
  public highlighted = false;

  @property({ attribute: false, type: Number })
  public decisionIndex = 0;

  // we use a property with no attribute because we expect the value to be updated
  // from outside the component
  // in Lit, the state decorator is used for internal state, while the property
  // decorator is used for state that other components can interact with
  /** The selection mode of the verification grid */
  @property({ attribute: false })
  public selectionMode: SelectionObserverType = "desktop";

  @query("#decision-button")
  private decisionButton!: HTMLButtonElement;

  @state()
  private keyboardHeldDown = false;

  @state()
  private shouldEmitNext = true;

  public get verificationDecision(): VerificationDecision {
    switch (true) {
      case this.verified === true:
        return VerificationDecision.TRUE;
      case this.verified === false:
        return VerificationDecision.FALSE;
      case this.skip === true:
        return VerificationDecision.SKIP;
      case this.unsure === true:
        return VerificationDecision.UNSURE;
      default:
        return VerificationDecision.FALSE;
    }
  }

  public classificationModels(): Classification[] {
    const decision = this.verificationDecision;
    const baseTag = this.tag ?? { text: "" };

    const baseModel = new Classification({
      type: "classification",
      confirmed: decision,
      tag: baseTag,
    });

    const additionalTagModels = this.additionalTags.map((tag) => {
      return new Classification({
        type: "classification",
        confirmed: decision,
        tag,
      });
    });

    return [baseModel, ...additionalTagModels];
  }

  public isShowingDecisionColor(): boolean {
    return this.keyboardHeldDown || this.highlighted;
  }

  private keyUpHandler = this.handleKeyUp.bind(this);
  private keyDownHandler = this.handleKeyDown.bind(this);

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("keydown", this.keyDownHandler);
    document.addEventListener("keyup", this.keyUpHandler);
  }

  public disconnectedCallback(): void {
    document.removeEventListener("keydown", this.keyDownHandler);
    document.removeEventListener("keyup", this.keyUpHandler);
    super.disconnectedCallback();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (event.key === ESCAPE_KEY) {
      return;
    }

    if (this.isShortcutKey(event)) {
      this.emitDecision();
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.isShortcutKey(event)) {
      this.keyboardHeldDown = true;
      return;
    }

    // if the user is holding down escape while pressing a shortcut, we should
    // not trigger the decision
    // this can happen because we are listening to the keyup event
    // meaning that the user can hold down the trigger key, decide against it
    // and then release the trigger key while holding down the escape key
    // to cancel creating the decision
    if (this.keyboardHeldDown && event.key.toLocaleLowerCase() === "escape") {
      this.shouldEmitNext = false;
      this.keyboardHeldDown = false;
    }
  }

  private isShortcutKey(event: KeyboardEvent): boolean {
    if (this.shortcut === undefined) {
      return false;
    }

    return event.key.toLowerCase() === this.shortcut.toLowerCase();
  }

  private emitDecision(): void {
    this.keyboardHeldDown = false;

    if (this.disabled) {
      return;
    }

    const emitNext = this.shouldEmitNext;
    this.shouldEmitNext = true;
    if (!emitNext) {
      return;
    }

    // I focus on the button clicked with keyboard shortcuts
    // so that the shortcut key has the same after effects as clicking
    // e.g. you can press enter to repeat the decision
    this.decisionButton.focus();

    const classification = this.classificationModels();
    const event: DecisionEvent = new CustomEvent<DecisionContent>(DecisionComponent.decisionEventName, {
      detail: {
        value: classification,
        target: this,
      },
      bubbles: true,
    });

    this.dispatchEvent(event);
  }

  public render() {
    const additionalTagsTemplate = this.additionalTags.length
      ? html`(${this.additionalTags.map((tag) => tag.text)})`
      : nothing;
    const keyboardLegend =
      this.shortcut && this.selectionMode !== "tablet" ? html`<kbd>${this.shortcut.toUpperCase()}</kbd>` : nothing;

    const buttonClasses = classMap({
      disabled: !!this.disabled,
      "show-decision-color": this.isShowingDecisionColor(),
      "cancel-next": !this.shouldEmitNext,
      [`decision-${this.decisionIndex}`]: true,
    });

    return html`
      <button
        id="decision-button"
        class="oe-btn-primary decision-button ${buttonClasses}"
        part="decision-button"
        title="Shortcut: ${this.shortcut}"
        aria-disabled="${this.disabled}"
        @click="${this.emitDecision}"
      >
        <div class="tag-text"><slot></slot></div>
        <div class="additional-tags">${additionalTagsTemplate}</div>
        ${this.selectionMode !== "tablet" ? html`<div class="keyboard-legend">${keyboardLegend}</div>` : nothing}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-decision": DecisionComponent;
  }
}
