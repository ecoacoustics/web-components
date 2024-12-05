import { customElement, property, query } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { DecisionComponent } from "../decision/decision";
import { SelectionObserverType } from "verification-grid/verification-grid";
import { DecisionsSlide } from "./slides/decisions";
import { PagingSlide } from "./slides/paging";
import { SelectionSlide } from "./slides/selection";
import { ShortcutsSlide } from "./slides/shortcuts";
import { AbstractSlide } from "./slides/abstractSlide";
import { map } from "lit/directives/map.js";
import { when } from "lit/directives/when.js";
import { StartTaskSlide } from "./slides/startTask";
import helpDialogStyles from "./css/style.css?inline";

export interface KeyboardShortcut {
  keys: string[];
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
@customElement("oe-verification-bootstrap")
export class VerificationBootstrapComponent extends AbstractComponent(LitElement) {
  static styles = unsafeCSS(helpDialogStyles);

  @property({ type: Array })
  public decisionElements!: DecisionComponent[];

  @property({ type: String })
  public selectionBehavior!: SelectionObserverType;

  @property({ type: Number })
  public verificationTasksCount!: number;

  @property({ type: Number })
  public classificationTasksCount!: number;

  @property({ type: Number })
  public activeSlide = 0;

  @query("#help-dialog")
  private helpDialogElement!: HTMLDialogElement;

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

  private slides: AbstractSlide[] = [];

  public firstUpdated(): void {
    const shouldShowHelpDialog = localStorage.getItem(helpPreferenceLocalStorageKey) === null;

    if (shouldShowHelpDialog) {
      this.showModal();
    }
  }

  public updated(): void {
    this.slides = [
      new SelectionSlide(),
      new PagingSlide(),
      new ShortcutsSlide(this.decisionShortcuts, this),
      new DecisionsSlide(this.hasVerificationTask, this.hasClassificationTask),
      new StartTaskSlide(this.hasVerificationTask, this.hasClassificationTask),
    ];
  }

  public showModal() {
    this.helpDialogElement.showModal();
    this.dispatchEvent(new CustomEvent("open"));
  }

  public closeModal(): void {
    this.dispatchEvent(new CustomEvent("close"));
    localStorage.setItem(helpPreferenceLocalStorageKey, "true");
    this.helpDialogElement.close();
  }

  private renderSlide(slide: AbstractSlide): HTMLTemplateResult {
    return html`
      <p>${slide.description}</p>
      ${when(
        slide.isSvg,
        () => html`<svg viewBox="-10 -10 270 250">${slide.render()}</svg>`,
        () => slide.render(),
      )}
    `;
  }

  private slidesTemplate(): HTMLTemplateResult {
    return html`
      <sl-carousel navigation pagination mouse-dragging>
        ${map(this.slides, (slide) => html`<sl-carousel-item>${this.renderSlide(slide)}</sl-carousel-item>`)}
      </sl-carousel>
    `;
  }

  public render(): HTMLTemplateResult {
    return html`
      <dialog id="help-dialog" @pointerdown="${() => this.helpDialogElement.close()}" @close="${this.closeModal}">
        <div class="dialog-container" @pointerdown="${(event: PointerEvent) => event.stopPropagation()}">
          <div class="dialog-content">${this.slidesTemplate()}</div>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-verification-bootstrap": VerificationBootstrapComponent;
  }
}
