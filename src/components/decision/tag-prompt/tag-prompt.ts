import { DecisionComponent, DecisionModels } from "../decision";
import { html, HTMLTemplateResult, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Decision, DecisionOptions } from "../../../models/decisions/decision";
import { keyboardShortcutTemplate } from "../../../templates/keyboardShortcut";
import { when } from "lit/directives/when.js";
import { classMap } from "lit/directives/class-map.js";
import tagPromptStyles from "./css/style.css?inline";

type TypeaheadCallback = <Value, Context extends Record<PropertyKey, unknown>>(
  text: string,
  context: Context,
) => Value[];

@customElement("oe-tag-prompt")
export class TagPromptComponent extends DecisionComponent {
  public static styles = [...super.styles, unsafeCSS(tagPromptStyles)];

  @property({ type: String })
  public shortcut = "";

  protected handleShortcutKey(event: KeyboardEvent): void {
    throw new Error("Method not implemented.");
  }

  protected isShortcutKey(event: KeyboardEvent): boolean {
    throw new Error("Method not implemented.");
  }

  public get decisionModels(): Partial<DecisionModels<Decision>> {
    throw new Error("Method not implemented.");
  }

  private popoverTemplate(): HTMLTemplateResult {
    return html`
      <div id="tag-popover" popover>
        adjksahfjkdhsfkjdh afjkh ajksdfh kladshfjkl hdsjkf hdjkshf kjahsdl aksljdsjkfdsfj dsjfkj saddf sajfkl sdjkf
        jsakl;fj
      </div>
    `;
  }

  public render(): HTMLTemplateResult {
    const buttonClasses = classMap({
      disabled: !!this.disabled,
    });

    const color = this.injector.colorService(new Decision(DecisionOptions.TRUE));

    return html`
      ${this.popoverTemplate()}

      <div class="decision-group-title decision-group"></div>

      <div class="decision-buttons decision-group">
        <button
          id="decision-button"
          class="oe-btn-primary decision-button ${buttonClasses}"
          popovertarget="tag-popover"
          part="decision-button"
          style="--ripple-color: var(${color})"
          aria-disabled="${this.disabled}"
        >
          <span class="oe-pill decision-color-pill" style="background-color: var(${color})"></span>

          <div class="button-text">
            <slot>Select Tag</slot>
          </div>

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

      <div class="attached-info decision-group"></div>
    `;
  }
}
