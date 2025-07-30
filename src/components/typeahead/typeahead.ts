import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, PropertyValues, unsafeCSS } from "lit";
import { callbackConverter } from "../../helpers/attributes";
import { map } from "lit/directives/map.js";
import { DOWN_ARROW_KEY, END_KEY, ENTER_KEY, HOME_KEY, TAB_KEY, UP_ARROW_KEY } from "../../helpers/keyboard";
import { classMap } from "lit/directives/class-map.js";
import typeaheadStyles from "./css/style.css?inline";

export type TypeaheadCallback<Value> = <Context extends Record<PropertyKey, unknown>>(
  text: string,
  context: Context,
) => Value[];

export type TypeaheadTextConverter = (model: any) => string;

/**
 * @description
 * An internal typeahead component
 */
@customElement("oe-typeahead")
export class TypeaheadComponent<T extends object = any> extends AbstractComponent(LitElement) {
  public static readonly selectedEventName = "typeahead-selected";

  public static styles = unsafeCSS(typeaheadStyles);

  @property({ attribute: "text-converter", type: Function, converter: callbackConverter as any })
  public textConverter: TypeaheadTextConverter = (model: T) => model.toString();

  @property({ type: Function, converter: callbackConverter as any })
  public search: TypeaheadCallback<T> = () => [];

  @property({ attribute: "max-items", type: Number, reflect: true })
  public maxItems = 10;

  @state()
  private typeaheadResults: T[] = [];

  @state()
  private focusedIndex = 0;

  @query("#typeahead-input")
  private readonly tagInput!: HTMLInputElement;

  public updated(change: PropertyValues<this>): void {
    if (change.has("search")) {
      this.handleSearchInvalidation();
    } else if (change.has("maxItems")) {
      this.focusedIndex = Math.min(this.focusedIndex, this.maxItems - 1);
    }
  }

  public override focus(): void {
    this.tagInput.focus();
  }

  public reset(): void {
    this.tagInput.value = "";
    this.handleFocusStart();

    // Let the consumer decide what to do if the input is empty.
    // (e.g. should we display all results, or nothing)
    this.handleSearchInvalidation("");
  }

  /**
   * Fetches new search results from the "search" callback
   * If a searchTerm is not provided, a DOM query will be performed to get the
   * typeahead text input value.
   */
  private handleSearchInvalidation(searchTerm?: string) {
    searchTerm ??= this.tagInput.value;
    this.typeaheadResults = this.search(searchTerm, {});

    // Similar to Google search, I reset the index of the focus index if the
    // user performs input.
    // Note that unlike Google search, we do not allow the focus head to have
    // nothing selected.
    this.focusedIndex = 0;
  }

  private handleInput(event: KeyboardEvent): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const value = event.target.value;
    this.handleSearchInvalidation(value);
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

      case HOME_KEY: {
        event.preventDefault();
        this.handleFocusStart();
        break;
      }

      case END_KEY: {
        event.preventDefault();
        this.handleFocusEnd();
        break;
      }

      case TAB_KEY: {
        // We don't want focus to escape the typeahead while it is open.
        // Therefore, we preventDefault and add our own behavior.
        event.preventDefault();

        if (event.shiftKey) {
          this.handleFocusUp();
        } else {
          this.handleFocusDown();
        }

        break;
      }

      case ENTER_KEY: {
        this.handleFocusSelection();
        break;
      }
    }
  }

  private handleFocusUp(): void {
    this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
  }

  private handleFocusDown(): void {
    this.focusedIndex = Math.min(this.focusedIndex + 1, this.typeaheadResults.length - 1);
  }

  private handleFocusStart(): void {
    this.focusedIndex = 0;
  }

  private handleFocusEnd(): void {
    this.focusedIndex = this.typeaheadResults.length - 1;
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
      <li id="result-${index}" class="typeahead-result" role="option">
        <button
          class="typeahead-result-action oe-btn ${classes}"
          aria-selected="${selected}"
          @click="${() => this.handleDecision(model)}"
        >
          ${this.textConverter(model)}
        </button>
      </li>
    `;
  }

  // To make the typeahead a11y friendly, I followed this guide
  // https://rebeccamdeprey.com/blog/building-an-accessible-autocomplete-component-with-react
  public render(): HTMLTemplateResult {
    // We slice the results in the render function, and store results that
    // cannot be shown so that if the maxItems changes while results are
    // visible, it can automatically expand.
    const truncatedResults = this.typeaheadResults.slice(0, this.maxItems);

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
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded="${this.typeaheadResults.length > 0}"
        aria-activedescendant="result-${this.focusedIndex}"
        aria-controls="typeahead-results"
        aria-autocomplete="list"
        @input="${this.handleInput}"
        @keydown="${this.handleKeyDown}"
      />

      <ol id="typeahead-results" role="listbox">
        ${map(truncatedResults, (model, index) => this.resultTemplate(model, index))}
      </ol>
    `;
  }
}
