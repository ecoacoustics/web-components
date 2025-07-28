import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { callbackConverter } from "../../helpers/attributes";
import { required } from "../../helpers/decorators";
import { map } from "lit/directives/map.js";
import typeaheadStyles from "./css/style.css?inline";

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

  private handleKeyDown(event: KeyboardEvent): void {}

  private handleSelected(model: T): T {
    const event = new CustomEvent(TypeaheadComponent.selectedEventName, {
      detail: model,
    });

    this.dispatchEvent(event);
  }

  private resultTemplate(model: T): HTMLTemplateResult {
    return html`
      <li class="typeahead-result">
        <button class="typeahead-result-action oe-btn" @click="${() => this.handleSelected(model)}">
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
        ${map(this.typeaheadResults, (model) => this.resultTemplate(model))}
      </ol>
    `;
  }
}
