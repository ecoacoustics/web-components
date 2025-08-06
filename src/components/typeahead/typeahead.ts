import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, PropertyValues, unsafeCSS } from "lit";
import { callbackConverter } from "../../helpers/attributes";
import { map } from "lit/directives/map.js";
import {
  DOWN_ARROW_KEY,
  END_KEY,
  ENTER_KEY,
  ESCAPE_KEY,
  HOME_KEY,
  TAB_KEY,
  UP_ARROW_KEY,
} from "../../helpers/keyboard";
import { classMap } from "lit/directives/class-map.js";
import typeaheadStyles from "./css/style.css?inline";

export type TypeaheadCallback<Value> = <Context extends Record<PropertyKey, unknown>>(
  text: string,
  context: Context,
) => Promise<Value[]> | Value[];

export type TypeaheadTextConverter = (model: any) => string;

/**
 * @description
 * An internal typeahead component
 *
 * @event oe-typeahead-selected
 */
@customElement("oe-typeahead")
export class TypeaheadComponent<T extends object = any> extends AbstractComponent(LitElement) {
  public static readonly selectedEventName = "oe-typeahead-selected";

  public static styles = unsafeCSS(typeaheadStyles);

  @property({ attribute: "text-converter", type: Function, converter: callbackConverter })
  public textConverter: TypeaheadTextConverter = (model: T) => model.toString();

  @property({ type: Function, converter: callbackConverter })
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
    // If the max-item's is decreased while the user is focused on an item that
    // no longer exists (due to a decreasing max-items), we focus the last
    // element that is now shown.
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
    const searchResults = this.search(searchTerm, {});

    // Use Promise.resolve here to unwrap the promise.
    // So non-async functions can continue to work because they will be resolved
    // immediately, but async functions can take some time to resolve.
    // Note that we use "then" instead of await here because if the async
    // callback is taking a long time to complete (e.g. server lag), we do not
    // wait to lock up the main thread awaiting a response.
    Promise.resolve(searchResults).then((value) => {
      this.typeaheadResults = value;

      // Similar to Google search, I reset the index of the focus index if the
      // user performs input.
      // Note that unlike Google search, we do not allow the focus head to have
      // nothing selected.
      //
      // I only move the focus index after the new results have been populated
      // so if the async function is taking a long time to complete
      // (e.g. server lag), the focus head cannot move to a position that would
      // not exist in the new search results.
      this.focusedIndex = 0;
    });
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

      case ESCAPE_KEY: {
        // If this typeahead is inside of a dialog and the user presses escape
        // with user input, we want to handle the escape key inside of this
        // component and prevent the dialog from closing.
        // If there is no input inside of the text input to clear, we allow the
        // the event to close the dialog.
        // This provides a way for users to close the dialog by double pressing
        // escape.
        if (this.tagInput.value.length > 0) {
          event.preventDefault();
        }

        break;
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    // We stop propagation so that shortcut event listeners are not triggered.
    event.stopPropagation();

    // we bind the escape key to keyUp because MacOS doesn't trigger keydown
    // events when the escape key is pressed
    // related to: https://stackoverflow.com/a/78872316
    if (event.key === ESCAPE_KEY) {
      this.reset();
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
          @pointerover="${() => (this.focusedIndex = index)}"
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
        @keyup="${this.handleKeyUp}"
      />

      <ol id="typeahead-results" role="listbox">
        ${map(truncatedResults, (model, index) => this.resultTemplate(model, index))}
      </ol>
    `;
  }
}
