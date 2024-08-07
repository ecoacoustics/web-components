import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, nothing, TemplateResult, unsafeCSS } from "lit";
import { DecisionComponent } from "../decision/decision";
import { SelectionObserverType } from "./verification-grid";
import { when } from "lit/directives/when.js";
import { loop } from "../../helpers/directives";
import { map } from "lit/directives/map.js";
import helpDialogStyles from "./css/help-dialog-styles.css?inline";

interface KeyboardShortcut {
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

  private keyboardShortcutTemplate(shortcuts: KeyboardShortcut[]): TemplateResult<1> {
    return html`
      <div class="keyboard-shortcuts">
        ${shortcuts.map(
          (shortcut) =>
            html` <div>
              ${loop(
                shortcut.key.split("+"),
                (key, { last }) => html`
                  <kbd class="key">${key}</kbd>
                  ${when(!last, () => "+")}
                `,
              )}

              <span class="description">${shortcut.description}</span>
            </div>`,
        )}
      </div>
    `;
  }

  private verificationTasks(): string[] {
    return ["verify if the tag applied is correct or not"];
  }

  private classificationTasks(): string[] {
    return [
      `Classify each audio segment ${this.classificationTasksCount} ` +
        `time${this.classificationTasksCount > 0 ? "s" : ""}, one for each of ` +
        "the classes",
    ];
  }

  private informationTemplate(): TemplateResult<1> {
    const taskCount = this.verificationTasksCount + this.classificationTasksCount;

    const todoItems: string[] = [];
    if (this.hasVerificationTask) {
      todoItems.push(...this.verificationTasks());
    }
    if (this.hasClassificationTask) {
      todoItems.push(...this.classificationTasks());
    }

    return html`
      <p>
        The Verification grid is a tool to help you validate and verify audio events either generated by a machine
        learning model or by a human annotator.
      </p>

      <p>For each audio segment you will need to complete ${taskCount} action</p>

      <ol>
        ${map(todoItems, (task) => html`<li>${task}</li>`)}
      </ol>

      <p>
        Any recordings that you do not apply a decision to will be marked as "SKIP" when the results are downloaded.
      </p>
    `;
  }

  public render() {
    const selectionKeyboardShortcuts: KeyboardShortcut[] = [
      { key: "Ctrl + A", description: "Select all items" },
      { key: "Shift + Click", description: "Add a range of items to the sub-selection" },
      { key: "Ctrl + Click", description: "Toggle the selection of a single item" },
      { key: "Ctrl + Shift + Click", description: "Select a range of items" },
      { key: "Esc", description: "Deselect all items" },
      { key: "Ctrl + D", description: "Deselect all items" },
      { key: "Alt", description: "Show possible keyboard shortcuts" },
      { key: "Left Arrow", description: "Go back to the previous page" },
      { key: "Right Arrow", description: "Go to the next page (when viewing history)" },
    ];

    // decision shortcuts are fetched from the decision elements
    // TODO: fix this
    const decisionShortcuts: KeyboardShortcut[] = [
      ...(
        this.decisionElements?.map((element) => {
          return {
            key: element.shortcut,
            description: `${element.innerText} ${element.additionalTags.length ? `(${element.additionalTags.map((model) => model.text)})` : ""}`,
          };
        }) ?? []
      ).filter((element) => element.key),
    ] as any;

    // TODO: there are some hacks in here to handle closing the modal when the user clicks off
    return html`
      <dialog
        id="help-dialog"
        @pointerdown="${() => this.helpDialogElement.close()}"
        @close="${this.handleDialogClose}"
      >
        <div class="dialog-container" @pointerdown="${(event: PointerEvent) => event.stopPropagation()}">
          <h1>Information</h1>
          ${this.informationTemplate()}

          <div class="dialog-content">
            <section>
              <h2>Decisions</h2>
              <p>Review the samples, press the button that makes the most sense</p>

              ${this.selectionBehavior !== "tablet"
                ? html`
                    <h3>Keyboard Shortcuts</h3>
                    ${this.keyboardShortcutTemplate(decisionShortcuts)}
                  `
                : nothing}
            </section>

            <section>
              <h2>Sub-Selection</h2>
              <p>You can apply a decision to only a few items in the grid by clicking on them.</p>

              ${this.selectionBehavior !== "tablet"
                ? html`
                    <h3>Keyboard Shortcuts</h3>
                    <p>
                      You can also use <kbd>Alt</kbd> + <math>a number</math> (e.g. <kbd>Alt</kbd> + <kbd>1</kbd>) to
                      select a tile using you keyboard. It is possible to see the possible keyboard shortcuts for
                      selection by holding down the <kbd>Alt</kbd> key.
                    </p>

                    ${this.keyboardShortcutTemplate(selectionKeyboardShortcuts)}
                  `
                : nothing}
            </section>
          </div>

          <hr />

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
