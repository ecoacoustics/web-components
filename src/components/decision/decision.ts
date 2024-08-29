import { LitElement, TemplateResult, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { booleanConverter } from "../../helpers/attributes";
import { ESCAPE_KEY } from "../../helpers/keyboard";
import { decisionColors } from "../../helpers/themes/decisionColors";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { Decision } from "../../models/decisions/decision";
import {
  injectionContext,
  SelectionObserverType,
  VerificationGridInjector,
} from "../verification-grid/verification-grid";
import { ClassificationComponent } from "./classification/classification";
import { VerificationComponent } from "./verification/verification";
import { consume } from "@lit/context";
import decisionStyles from "./css/style.css?inline";
import { decisionColor } from "../../services/colors";
import { KeyboardShortcut } from "verification-grid/help-dialog";

interface DecisionContent {
  value: Decision[];
}

export type DecisionEvent = CustomEvent<DecisionContent>;
export type DecisionComponentUnion = DecisionComponent | VerificationComponent | ClassificationComponent;

/**
 * @description
 * A common abstract decision component that can be implemented by different
 * types of decisions.
 * e.g. a verification decision or a classification decision
 *
 * @fires decision
 */
@customElement("oe-decision")
export abstract class DecisionComponent extends AbstractComponent(LitElement) {
  public static styles = [unsafeCSS(decisionStyles), decisionColors];
  public static readonly decisionEventName = "decision" as const;

  protected abstract handleShortcutKey(event: KeyboardEvent): void;
  protected abstract isShortcutKey(event: KeyboardEvent): Readonly<boolean>;

  protected constructor() {
    super();
  }

  @consume({ context: injectionContext, subscribe: true })
  @state()
  protected injector: VerificationGridInjector = {
    colorService: decisionColor,
  };

  /** Disables the decision button and prevents decision events from firing */
  @property({ attribute: "disabled", type: Boolean, converter: booleanConverter, reflect: true })
  public disabled = false;

  // we use a property with no attribute because we expect the value to be
  // updated from outside the component in Lit, the state decorator is used for
  // internal state, while the property decorator is used for state that other
  // components can interact with
  /** The selection mode of the verification grid */
  @property({ attribute: false })
  public selectionMode: SelectionObserverType = "desktop";

  private shouldEmitNext = true;
  private keyboardHeldDown = false;

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

  // you should override this method in your subclass
  public shortcutKeys(): KeyboardShortcut[] {
    return [];
  }

  protected emitDecision(value: Decision[]): void {
    this.keyboardHeldDown = false;

    if (this.disabled) {
      return;
    }

    const emitNext = this.shouldEmitNext;
    this.shouldEmitNext = true;
    if (!emitNext) {
      return;
    }

    const event = new CustomEvent<DecisionContent>(DecisionComponent.decisionEventName, {
      detail: { value },
      bubbles: true,
    });

    this.dispatchEvent(event);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (event.key === ESCAPE_KEY) {
      return;
    }

    this.handleShortcutKey(event);
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
    if (this.keyboardHeldDown && event.key === ESCAPE_KEY) {
      this.shouldEmitNext = false;
      this.keyboardHeldDown = false;
    }
  }

  public abstract render(): TemplateResult;
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-decision": DecisionComponent;
  }
}
