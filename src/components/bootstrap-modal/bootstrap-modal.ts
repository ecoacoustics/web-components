import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, nothing, unsafeCSS } from "lit";
import { DecisionComponent } from "../decision/decision";
import { SelectionObserverType } from "verification-grid/verification-grid";
import helpDialogStyles from "./css/style.css?inline";

export interface KeyboardShortcut {
  key: string;
  description: string;
}

const helpPreferenceLocalStorageKey = "oe-verification-grid-dialog-preferences";

/**
 * @description
 * A dialog that provides information about the verification grid and how to use it.
 *
 * @event open - Dispatched when the dialog is opened
 * @event close - Dispatched when the dialog is closed
 */
@customElement("oe-verification-help-dialog")
export class VerificationHelpDialogComponent extends AbstractComponent(LitElement) {
  static styles = unsafeCSS(helpDialogStyles);

  @property({ type: Array })
  public decisionElements!: DecisionComponent[];

  @property({ type: String })
  public selectionBehavior!: SelectionObserverType;

  @property({ type: Number })
  public verificationTasksCount!: number;

  @property({ type: Number })
  public classificationTasksCount!: number;

  @state()
  private showRememberOption = true;

  @query("#help-dialog")
  private helpDialogElement!: HTMLDialogElement;

  @query("#dialog-preference")
  private dialogPreferenceElement: HTMLInputElement | undefined;

  public get open(): boolean {
    return this.helpDialogElement.open;
  }

  public get hasVerificationTask(): boolean {
    return this.verificationTasksCount > 0;
  }

  public get hasClassificationTask(): boolean {
    return this.classificationTasksCount > 0;
  }

  public get decisionShortcuts(): KeyboardShortcut[] {
    if (!this.decisionElements) {
      return [];
    }

    return this.decisionElements.flatMap((element) => element.shortcutKeys());
  }

  public firstUpdated(): void {
    const shouldShowHelpDialog = localStorage.getItem(helpPreferenceLocalStorageKey) === null;

    if (shouldShowHelpDialog) {
      this.showModal();
    }
  }

  public showModal(showRememberOption = true) {
    this.showRememberOption = showRememberOption;
    this.helpDialogElement.showModal();
    this.dispatchEvent(new CustomEvent("open"));
  }

  private handleDialogClose(): void {
    this.dispatchEvent(new CustomEvent("close"));

    const dialogPreferenceElement = this.dialogPreferenceElement;
    if (!dialogPreferenceElement) {
      return;
    }

    const shouldNotShowDialog = dialogPreferenceElement.checked;
    if (shouldNotShowDialog) {
      localStorage.setItem(helpPreferenceLocalStorageKey, "true");
    }
  }

  public render(): HTMLTemplateResult {
    return html`
      <dialog
        id="help-dialog"
        @pointerdown="${() => this.helpDialogElement.close()}"
        @close="${this.handleDialogClose}"
      >
        <div class="dialog-container" @pointerdown="${(event: PointerEvent) => event.stopPropagation()}">
          <h1>Information</h1>

          <form class="dialog-controls" method="dialog">
            <label class="show-again">
              ${this.showRememberOption
                ? html`
                    <input
                      id="dialog-preference"
                      name="dialog-preference"
                      type="checkbox"
                      ?checked="${localStorage.getItem(helpPreferenceLocalStorageKey) !== null}"
                    />
                    Do not show this dialog again
                  `
                : nothing}
            </label>
            <button
              data-testid="dismiss-help-dialog-btn"
              class="oe-btn oe-btn-primary close-btn"
              type="submit"
              autofocus
            >
              Close
            </button>
          </form>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-verification-help-dialog": VerificationHelpDialogComponent;
  }
}
