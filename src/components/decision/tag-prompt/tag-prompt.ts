import { DecisionComponent, DecisionModels } from "../decision";
import { html, HTMLTemplateResult, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { Decision, DecisionOptions } from "../../../models/decisions/decision";
import { keyboardShortcutTemplate } from "../../../templates/keyboardShortcut";
import { when } from "lit/directives/when.js";
import { classMap } from "lit/directives/class-map.js";
import { Tag } from "../../../models/tag";
import { callbackConverter } from "../../../helpers/attributes";
import { repeat } from "lit/directives/repeat.js";
import { ESCAPE_KEY } from "../../../helpers/keyboard";
import { TagAdjustment } from "../../../models/decisions/tag-adjustment";
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

  @property({ type: Function, converter: callbackConverter as any })
  public search!: TypeaheadCallback;

  @state()
  private typeaheadResults: Tag[] = [];

  @query("#tag-popover")
  private readonly tagPopover!: HTMLDivElement;

  public get decisionModels(): Partial<DecisionModels<Decision>> {
    throw new Error("Method not implemented.");
  }

  /** Open the tag prompt popover */
  public open(): void {
    this.tagPopover.showPopover();
  }

  /** Close the tag prompt popover */
  public close(): void {
    this.tagPopover.hidePopover();
  }

  protected handleShortcutKey(event: KeyboardEvent): void {
    if (this.isShortcutKey(event) && !(event.target instanceof this.constructor)) {
      this.tagPopover.togglePopover();
    }
  }

  protected isShortcutKey(event: KeyboardEvent): boolean {
    return event.key.toLowerCase() === this.shortcut.toLowerCase();
  }

  private handleToggle(event: ToggleEvent): void {
    if (event.newState === "open") {
      const searchInput = this.tagPopover.querySelector("input") as HTMLInputElement;
      searchInput.focus();
    } else {
      this.verificationGrid?.focus();
    }
  }

  private handleInput(event: KeyboardEvent): void {
    if (event.key === ESCAPE_KEY) {
      this.close();
      return;
    } else if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const value = event.target.value;
    if (value.length > 0) {
      console.debug(this.search);
      this.typeaheadResults = this.search(event.target.value, {});
    } else {
      this.typeaheadResults = [];
    }
  }

  private handleDecision(decisionModel: TagAdjustment): void {
    this.emitDecision([decisionModel]);
    this.close();
  }

  private tagTemplate(tag: Tag): HTMLTemplateResult {
    const decisionModel = new TagAdjustment(tag);

    return html`
      <li class="typeahead-result">
        <button class="typeahead-result-action oe-btn" @click="${() => this.handleDecision(decisionModel)}">
          ${tag.text}
        </button>
      </li>
    `;
  }

  private popoverTemplate(): HTMLTemplateResult {
    return html`
      <div id="tag-popover" popover @toggle="${this.handleToggle}">
        <div class="tag-popover-header">
          <h3 class="tag-popover-title">Tag Correction</h3>
          <button class="tag-popover-close" @click="${this.close}">Close</button>
        </div>

        <div class="tag-popover-body">
          <label id="tag-input-label">
            Provide tag correction:
            <input
              id="tag-input"
              type="search"
              placeholder="Type to search for tags"
              enterkeyhint="done"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              @keyup="${this.handleInput}"
            />
          </label>

          <ol class="typeahead-results">
            ${repeat(
              this.typeaheadResults,
              (tag) => tag.text,
              (tag) => this.tagTemplate(tag),
            )}
          </ol>
        </div>
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
          ?disabled="${this.disabled}"
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
