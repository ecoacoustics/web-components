import { customElement, property, query } from "lit/decorators.js";
import { Classification } from "../../../models/decisions/classification";
import { Verification } from "../../../models/decisions/verification";
import { DecisionComponent, DecisionModels } from "../decision";
import { required } from "../../../helpers/decorators";
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { DecisionOptions } from "../../../models/decisions/decision";
import { enumConverter, tagArrayConverter } from "../../../helpers/attributes";
import { KeyboardShortcut, keyboardShortcutTemplate } from "../../../templates/keyboardShortcut";
import { Tag } from "../../../models/tag";
import { when } from "lit/directives/when.js";
import { toTitleCase } from "../../../helpers/text/titleCase";

/**
 * @description
 * A decision that when made will emit a Verification decision
 * and additional tags in the form of Classification models
 *
 * @slot - Additional content to be displayed in the decision button
 *
 * @csspart decision-button - The button that triggers the decision
 *
 * @event decision
 */
@customElement("oe-verification")
export class VerificationComponent extends DecisionComponent {
  @required()
  @property({ type: String, converter: enumConverter(DecisionOptions) })
  public verified: DecisionOptions = DecisionOptions.TRUE;

  /** Value that will be added to the oe-additional-tags column */
  @property({ attribute: "additional-tags", type: Array, converter: tagArrayConverter, reflect: true })
  public additionalTags: Tag[] = [];

  /** A keyboard key that when pressed will act as a click event on the button */
  @property({ type: String })
  public shortcut = "";

  @query("#decision-button")
  private decisionButton!: HTMLButtonElement;

  public override get decisionModels(): Partial<DecisionModels<Verification>> {
    return this._decisionModels;
  }

  private _decisionModels: Partial<DecisionModels<Verification>> = {};

  public override shortcutKeys(): KeyboardShortcut[] {
    let description = `Decide ${this.verified}`;
    if (this.additionalTags.length) {
      const additionalTagText = this.additionalTags.map((tag) => tag.text).join(", ");
      description += ` and also these tags: ${additionalTagText}`;
    }

    return [{ keys: [this.shortcut], description }];
  }

  protected override handleShortcutKey(event: KeyboardEvent): void {
    if (this.isShortcutKey(event)) {
      this.handleDecision();
      this.decisionButton.focus();
    }
  }

  protected override isShortcutKey(event: KeyboardEvent): boolean {
    return event.key.toLowerCase() === this.shortcut.toLowerCase();
  }

  protected handleDecision(): void {
    this.emitDecision(this.generateDecisionModels());
  }

  private generateDecisionModels(): [Verification, ...Classification[]] {
    const verification = new Verification(this.verified);

    const classifications: Classification[] = [];
    for (const additionalTag of this.additionalTags) {
      const classification = new Classification(this.verified, additionalTag);
      classifications.push(classification);
    }

    return [verification, ...classifications];
  }

  private additionalTagsTemplate() {
    return this.additionalTags.length ? html`(${this.additionalTags.map((tag) => tag.text).join(", ")})` : nothing;
  }

  public render() {
    const buttonClasses = classMap({
      disabled: !!this.disabled,
    });

    // our TypeScript typing of generateDecisionModels() guarantees that the
    // first element in the array is the base Verification model
    const decisionModels = this.generateDecisionModels();
    const verificationModel: Verification = decisionModels[0];
    const color = this.injector.colorService(verificationModel);

    this._decisionModels[this.verified] = verificationModel;

    return html`
      <div class="decision-group">
        <div class="decision-group-title"></div>
      </div>

      <div class="decision-buttons">
        <button
          id="decision-button"
          class="oe-btn-primary decision-button ${buttonClasses}"
          part="decision-button"
          style="--ripple-color: var(${color})"
          aria-disabled="${this.disabled}"
          @click="${() => this.handleDecision()}"
        >
          <span class="oe-pill decision-color-pill" style="background-color: var(${color})"></span>

          <div class="button-text">
            <slot>${toTitleCase(this.verified)}</slot>
          </div>

          <div class="additional-tags">${this.additionalTagsTemplate()}</div>

          <div>
            <!--
              even if there is no shortcut, we reserve a space for the shortcut
              key so that all buttons are the same height.
            -->
            <span class="shortcut-legend">
              ${when(
                !this.isMobile && this.shortcut,
                () => html`${keyboardShortcutTemplate({ keys: [this.shortcut] })}`,
              )}
            </span>
          </div>
        </button>
      </div>
    `;
  }
}
