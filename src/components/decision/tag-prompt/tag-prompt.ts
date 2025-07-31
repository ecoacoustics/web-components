import { DecisionComponent, DecisionModels } from "../decision";
import { html, HTMLTemplateResult, unsafeCSS } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { Decision } from "../../../models/decisions/decision";
import { keyboardShortcutTemplate } from "../../../templates/keyboardShortcut";
import { when } from "lit/directives/when.js";
import { classMap } from "lit/directives/class-map.js";
import { Tag } from "../../../models/tag";
import { callbackConverter } from "../../../helpers/attributes";
import { TagAdjustment } from "../../../models/decisions/tagAdjustment";
import { TypeaheadCallback, TypeaheadComponent } from "../../../components/typeahead/typeahead";
import { Constructor } from "../../../helpers/types/advancedTypes";
import tagPromptStyles from "./css/style.css?inline";

@customElement("oe-tag-prompt")
export class TagPromptComponent extends DecisionComponent {
  public static styles = [...super.styles, unsafeCSS(tagPromptStyles)];

  @property({ type: String })
  public shortcut = "";

  @property({ type: Function, converter: callbackConverter as any })
  public search: TypeaheadCallback<Tag> = () => [];

  @query("#tag-popover")
  private readonly tagPopover!: HTMLDivElement;

  @query("#tag-typeahead")
  private readonly tagTypeahead!: TypeaheadComponent;

  public get decisionModels(): Partial<DecisionModels<Decision>> {
    throw new Error("Method not implemented.");
  }

  public get decisionConstructor(): Constructor<Decision> {
    return TagAdjustment;
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
    if (this.isShortcutKey(event) && !(event.target instanceof this.constructor) && !this.disabled) {
      this.tagPopover.togglePopover();
    }
  }

  protected isShortcutKey(event: KeyboardEvent): boolean {
    return event.key.toLowerCase() === this.shortcut.toLowerCase();
  }

  private handleToggle(event: ToggleEvent): void {
    if (event.newState === "open") {
      this.tagTypeahead.reset();
      this.tagTypeahead.focus();
    } else {
      this.verificationGrid?.focus();
    }
  }

  private handleDecision(event: CustomEvent<Tag>): void {
    const tag = event.detail;
    const decisionModel = new TagAdjustment(tag);
    this.emitDecision([decisionModel]);

    this.close();
  }

  private popoverTemplate(): HTMLTemplateResult {
    return html`
      <dialog id="tag-popover" popover @toggle="${this.handleToggle}">
        <div class="tag-popover-header">
          <h3 class="tag-popover-title">Tag Correction</h3>
          <button class="tag-popover-close" @click="${this.close}">Close</button>
        </div>

        <div class="tag-popover-body">
          <oe-typeahead
            id="tag-typeahead"
            .search="${this.search}"
            .textConverter="${(tag: Tag) => tag.text}"
            @typeahead-selected="${this.handleDecision}"
          ></oe-typeahead>
        </div>
      </dialog>
    `;
  }

  public render(): HTMLTemplateResult {
    const buttonClasses = classMap({
      disabled: !!this.disabled,
    });

    const color = this.injector.colorService(new TagAdjustment({ text: "" }));

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
          aria-keyshortcuts="${this.shortcut}"
          ?disabled="${this.disabled}"
        >
          <span class="oe-pill decision-color-pill" style="background: var(${color})"></span>

          <div class="button-text">
            <slot>Correct Tag</slot>
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
