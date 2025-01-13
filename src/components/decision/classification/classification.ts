import { customElement, property, query } from "lit/decorators.js";
import { tagConverter } from "../../../helpers/attributes";
import { required } from "../../../helpers/decorators";
import { Classification } from "../../../models/decisions/classification";
import { DecisionComponent } from "../decision";
import { Tag } from "../../../models/tag";
import { DecisionOptions } from "../../../models/decisions/decision";
import { html, nothing, TemplateResult, unsafeCSS } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { map } from "lit/directives/map.js";
import { KeyboardShortcut, shiftSymbol } from "../../../templates/keyboardShortcut";
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
 * @fires decision
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

  protected get derivedTrueShortcut(): string | undefined {
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

  protected get derivedFalseShortcut(): string | undefined {
    if (this.falseShortcut) {
      return this.falseShortcut;
    } else if (!this.trueShortcut) {
      return;
    }

    return this.trueShortcut === this.trueShortcut.toUpperCase()
      ? this.trueShortcut.toLowerCase()
      : this.trueShortcut.toUpperCase();
  }

  public override shortcutKeys(): KeyboardShortcut[] {
    const shortcuts: KeyboardShortcut[] = [];

    if (this.derivedTrueShortcut) {
      shortcuts.push({
        keys: [this.derivedTrueShortcut],
        description: `Is ${this.tag.text}`,
      });
    }

    if (this.derivedFalseShortcut) {
      shortcuts.push({
        keys: [this.derivedFalseShortcut],
        description: `Not ${this.tag.text}`,
      });
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

  protected override isShortcutKey(event: KeyboardEvent): Readonly<boolean> {
    return this.isTrueShortcutKey(event) || this.isFalseShortcutKey(event);
  }

  private isTrueShortcutKey(event: KeyboardEvent): boolean {
    if (!this.derivedTrueShortcut) {
      return false;
    }

    return event.key === this.derivedTrueShortcut;
  }

  private isFalseShortcutKey(event: KeyboardEvent): boolean {
    if (!this.derivedFalseShortcut) {
      return false;
    }

    return event.key === this.derivedFalseShortcut;
  }

  private keyboardShortcutTemplate(shortcut: string): TemplateResult {
    const isShortcutUpperCase = shortcut === shortcut.toUpperCase();
    const shiftKey = isShortcutUpperCase ? shiftSymbol : "";

    return html` <kbd class="shortcut-legend">${shiftKey}${shortcut}</kbd> `;
  }

  private decisionButtonTemplate(decision: DecisionOptions): TemplateResult {
    const buttonClasses = classMap({
      disabled: !!this.disabled,
      "oe-btn-primary": decision === DecisionOptions.TRUE || decision === DecisionOptions.FALSE,
      "oe-btn-secondary": decision === DecisionOptions.UNSURE || decision === DecisionOptions.SKIP,
    });

    const shortcut = decision === DecisionOptions.TRUE ? this.derivedTrueShortcut : this.derivedFalseShortcut;
    const decisionModel = new Classification(decision, this.tag);
    const color = this.injector.colorService(decisionModel);

    return html`
      <button
        id="${decision}-decision-button"
        class="decision-button ${buttonClasses}"
        part="${decision}-decision-button"
        title="Shortcut: ${shortcut}"
        style="--ripple-color: var(${color})"
        aria-label="${decision} decision for ${this.tag.text}"
        aria-disabled="${this.disabled}"
        @click="${() => this.emitDecision([decisionModel])}"
      >
        <span class="oe-pill decision-color-pill" style="background-color: var(${color})"></span>

        <div class="button-text">${decision}</div>
        ${!this.isMobile && shortcut ? this.keyboardShortcutTemplate(shortcut) : nothing}
      </button>
    `;
  }

  public override render() {
    const buttonOptions = [DecisionOptions.TRUE, DecisionOptions.FALSE];

    // prettier-ignore
    return html`
      <div class="decision-group">
        <div class="decision-group-title">
          <slot>${this.tag.text}</slot>
        </div>

        <div class="decision-buttons">
          ${map(buttonOptions, (decision: DecisionOptions) =>
            this.decisionButtonTemplate(decision)
          )}
        </div>
      </div>
    `;
  }
}
