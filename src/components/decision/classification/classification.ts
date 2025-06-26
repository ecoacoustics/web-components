import { customElement, property, query } from "lit/decorators.js";
import { tagConverter } from "../../../helpers/attributes";
import { required } from "../../../helpers/decorators";
import { Classification } from "../../../models/decisions/classification";
import { DecisionComponent, DecisionModels } from "../decision";
import { Tag } from "../../../models/tag";
import { DecisionOptions } from "../../../models/decisions/decision";
import { html, HTMLTemplateResult, nothing, unsafeCSS } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { map } from "lit/directives/map.js";
import {
  KeyboardShortcut,
  KeyboardShortcutKey,
  keyboardShortcutTemplate,
  shiftSymbol,
  ShiftSymbolVariant,
} from "../../../templates/keyboardShortcut";
import { toTitleCase } from "../../../helpers/text/titleCase";
import classificationStyles from "./css/style.css?inline";

/**
 * @description
 * A decision that when made will emit a Classification decision
 * and additional tags in the form of Classification models
 *
 * @slot - Additional content to be displayed in the decision groups title
 *
 * @csspart true-decision-button - Styling selector to target the true decision button
 * @csspart false-decision-button - Styling selector to target the false decision button
 *
 * @event decision
 */
@customElement("oe-classification")
export class ClassificationComponent extends DecisionComponent {
  public static styles = [...super.styles, unsafeCSS(classificationStyles)];

  @required()
  @property({ type: String, converter: tagConverter })
  public tag!: Tag;

  /**
   * A shortcut key that when pressed will trigger a true classification
   * decision to be emitted
   */
  @property({ attribute: "true-shortcut", type: String })
  public trueShortcut?: string;

  /**
   * A shortcut key that when pressed will trigger a false classification
   * decision to be emitted
   */
  @property({ attribute: "false-shortcut", type: String })
  public falseShortcut?: string;

  @query("#true-decision-button")
  private trueDecisionButton!: HTMLButtonElement;

  @query("#false-decision-button")
  private falseDecisionButton!: HTMLButtonElement;

  public get decisionModels(): Partial<DecisionModels<Classification>> {
    return this._decisionModels;
  }

  private _decisionModels: Partial<DecisionModels<Classification>> = {};

  private get trueKeyboardShortcut(): KeyboardShortcut | undefined {
    const shortcut = this.deriveTrueShortcutKey();
    if (shortcut) {
      const keys: KeyboardShortcutKey[] = [shortcut];
      if (this.isShortcutUppercase(shortcut)) {
        keys.unshift(shiftSymbol);
      }

      return { keys, description: `Is ${this.tag.text}` };
    }
  }

  private get falseKeyboardShortcut(): KeyboardShortcut | undefined {
    const shortcut = this.deriveFalseShortcutKey();
    if (shortcut) {
      const keys: KeyboardShortcutKey[] = [shortcut];
      if (this.isShortcutUppercase(shortcut)) {
        keys.unshift(shiftSymbol);
      }

      return { keys, description: `Is ${this.tag.text}` };
    }
  }

  public override shortcutKeys(): KeyboardShortcut[] {
    const shortcuts: KeyboardShortcut[] = [];

    const trueShortcut = this.trueKeyboardShortcut;
    if (trueShortcut) {
      shortcuts.push(trueShortcut);
    }

    const falseShortcut = this.falseKeyboardShortcut;
    if (falseShortcut) {
      shortcuts.push(falseShortcut);
    }

    return shortcuts;
  }

  protected override handleShortcutKey(event: KeyboardEvent): void {
    if (this.isTrueShortcutKey(event)) {
      this.trueDecisionButton.click();
      this.falseDecisionButton.focus();
      return;
    }

    if (this.isFalseShortcutKey(event)) {
      this.falseDecisionButton.click();
      this.falseDecisionButton.focus();
    }
  }

  protected override isShortcutKey(event: KeyboardEvent): boolean {
    return this.isTrueShortcutKey(event) || this.isFalseShortcutKey(event);
  }

  /**
   * Returns a true shortcut key from the "true-shortcut" attribute.
   * If there is no true shortcut, this function will derive a shortcut key from
   * the false shortcut key if a false shortcut key is defined without a true
   * shortcut key.
   */
  private deriveTrueShortcutKey(): string | undefined {
    if (this.trueShortcut) {
      return this.trueShortcut;
    } else if (!this.falseShortcut) {
      // if there is no false shortcut to derive a shortcut from, then we need
      // cannot derive a true shortcut
      return;
    }

    return this.falseShortcut === this.falseShortcut.toUpperCase()
      ? this.falseShortcut.toLowerCase()
      : this.falseShortcut.toUpperCase();
  }

  /**
   * Returns a false shortcut key from the "false-shortcut" attribute.
   * If there is no true shortcut, this function will derive a shortcut key from
   * the true shortcut key if a true shortcut key is defined without a false
   * shortcut key.
   */
  private deriveFalseShortcutKey(): string | undefined {
    if (this.falseShortcut) {
      return this.falseShortcut;
    } else if (!this.trueShortcut) {
      return;
    }

    return this.trueShortcut === this.trueShortcut.toUpperCase()
      ? this.trueShortcut.toLowerCase()
      : this.trueShortcut.toUpperCase();
  }

  private isShortcutUppercase(key: string) {
    return key === key.toUpperCase();
  }

  private isTrueShortcutKey(event: KeyboardEvent): boolean {
    const shortcut = this.deriveTrueShortcutKey();
    if (!shortcut) {
      return false;
    }

    return event.key === shortcut;
  }

  private isFalseShortcutKey(event: KeyboardEvent): boolean {
    const shortcut = this.deriveFalseShortcutKey();
    if (!shortcut) {
      return false;
    }

    return event.key === shortcut;
  }

  private decisionButtonTemplate(decision: DecisionOptions): HTMLTemplateResult {
    const buttonClasses = classMap({
      disabled: !!this.disabled,
      "oe-btn-primary": decision === DecisionOptions.TRUE || decision === DecisionOptions.FALSE,
      "oe-btn-secondary": decision === DecisionOptions.UNSURE || decision === DecisionOptions.SKIP,
    });

    const shortcut = decision === DecisionOptions.TRUE ? this.trueKeyboardShortcut : this.falseKeyboardShortcut;
    const decisionModel = new Classification(decision, this.tag);
    const color = this.injector.colorService(decisionModel);

    this.decisionModels[decision] = decisionModel;

    return html`
      <button
        id="${decision}-decision-button"
        class="decision-button ${buttonClasses}"
        part="${decision}-decision-button"
        style="--ripple-color: var(${color})"
        aria-label="${decision} decision for ${this.tag.text}"
        aria-disabled="${this.disabled}"
        @click="${() => this.emitDecision([decisionModel])}"
      >
        <span class="oe-pill decision-color-pill" style="background-color: var(${color})"></span>

        <div class="button-text">${toTitleCase(decision)}</div>

        ${!this.isMobile && shortcut ? keyboardShortcutTemplate(shortcut, ShiftSymbolVariant.inline) : nothing}
      </button>
    `;
  }

  public override render() {
    const buttonOptions = [DecisionOptions.TRUE, DecisionOptions.FALSE] as const satisfies DecisionOptions[];

    // prettier-ignore
    return html`
      <div class="decision-group-title">
        <slot>${this.tag.text}</slot>
      </div>

      <div class="decision-buttons">
        ${map(buttonOptions, (decision: DecisionOptions) =>
          this.decisionButtonTemplate(decision)
        )}
      </div>

      <div class="attached-info"></div>
    `;
  }
}
