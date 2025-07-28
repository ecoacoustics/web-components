import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { callbackConverter } from "../../helpers/attributes";
import { required } from "../../helpers/decorators";
import { map } from "lit/directives/map.js";
import typeaheadStyles from "./css/style.css?inline";
import { DOWN_ARROW_KEY, ENTER_KEY, UP_ARROW_KEY } from "../../helpers/keyboard";
import { classMap } from "lit/directives/class-map.js";

export type TypeaheadCallback<Value> = <Context extends Record<PropertyKey, unknown>>(
  text: string,
  context: Context,
) => Value[];

/**
 * @description
 * An internal typeahead component that can be used in our components.
 *
 * @cssproperty [--decision-color] - The border color that is applied when a
 * decision is being shown
 */
@customElement("oe-typeahead")
export class TypeaheadComponent<T = any> extends AbstractComponent(LitElement) {
  public static readonly selectedEventName = "typeahead-selected";

  public static styles = unsafeCSS(typeaheadStyles);

  @required()
  @property({ type: Function, converter: callbackConverter as any })
  public search!: TypeaheadCallback<T>;

  @required()
  @property({ attribute: false })
  public textConverter!: (model: T) => string;

  @state()
  private typeaheadResults: T[] = [];

  @state()
  private focusedIndex = -1;

  @query("#typeahead-input")
  private readonly tagInput!: HTMLInputElement;

  public override focus(): void {
    this.tagInput.focus();
  }

  public reset(): void {
    this.tagInput.value = "";
    this.typeaheadResults = [];
  }

  private handleInput(event: KeyboardEvent): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const value = event.target.value;
    if (value.length > 0) {
      this.typeaheadResults = this.search(event.target.value, {});
    } else {
      this.typeaheadResults = [];
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    event.stopPropagation();

    switch (event.key) {
      case DOWN_ARROW_KEY: {
        event.preventDefault();
        this.handleFocusDown();
        break;
      }

      case UP_ARROW_KEY: {
        event.preventDefault();
        this.handleFocusUp();
        break;
      }

      case ENTER_KEY: {
        this.handleFocusSelection();
        break;
      }
    }
  }

  private handleFocusUp(): void {
    this.focusedIndex = Math.max(this.focusedIndex - 1, -1);
  }

  private handleFocusDown(): void {
    this.focusedIndex = Math.min(this.focusedIndex + 1, this.typeaheadResults.length - 1);
  }

  private handleFocusSelection(): void {
    const model = this.typeaheadResults[this.focusedIndex];
    if (model) {
      this.handleDecision(model);
    }
  }

  private handleDecision(model: T): void {
    const event = new CustomEvent(TypeaheadComponent.selectedEventName, {
      detail: model,
    });

    this.dispatchEvent(event);
  }

  private resultTemplate(model: T, index: number): HTMLTemplateResult {
    const selected = this.focusedIndex === index;
    const classes = classMap({ selected });

    return html`
      <li class="typeahead-result">
        <button class="typeahead-result-action oe-btn ${classes}" @click="${() => this.handleDecision(model)}">
          ${this.textConverter(model)}
        </button>
      </li>
    `;
  }

  public render(): HTMLTemplateResult {
    return html`
      <input
        id="typeahead-input"
        type="search"
        placeholder="Type to search for tags"
        enterkeyhint="done"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        @keyup="${this.handleInput}"
        @keydown="${this.handleKeyDown}"
      />

      <ol class="typeahead-results">
        ${map(this.typeaheadResults, (model, index) => this.resultTemplate(model, index))}
      </ol>
    `;
  }
}
