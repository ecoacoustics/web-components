import { customElement, property, query } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { DecisionComponent } from "../decision/decision";
import { SelectionObserverType } from "verification-grid/verification-grid";
import { AbstractSlide } from "./slides/abstractSlide";
import { map } from "lit/directives/map.js";
import { when } from "lit/directives/when.js";
import { DecisionsSlide } from "./slides/decisions/decisions";
import { PagingSlide } from "./slides/paging/paging";
import { SelectionSlide } from "./slides/selection/selection";
import { ShortcutsSlide } from "./slides/shortcuts/shortcuts";
import helpDialogStyles from "./css/style.css?inline";

import decisionSlideStyles from "./slides/decisions/animations.css?inline";
import pagingSlideStyles from "./slides/paging/animations.css?inline";
import selectionSlideStyles from "./slides/selection/animations.css?inline";
import shortcutSlideStyles from "./slides/shortcuts/animations.css?inline";

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
  static styles = [
    unsafeCSS(helpDialogStyles),
    unsafeCSS(decisionSlideStyles),
    unsafeCSS(pagingSlideStyles),
    unsafeCSS(selectionSlideStyles),
    unsafeCSS(shortcutSlideStyles),
  ];

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
      // new DecisionsSlide(this.hasVerificationTask, this.hasClassificationTask),
      // new SelectionSlide(),
      // new PagingSlide(),
      // new ShortcutsSlide(this.decisionShortcuts, this),

      new ShortcutsSlide(this.decisionShortcuts, this),
      new SelectionSlide(),
      new PagingSlide(),
      new DecisionsSlide(this.hasVerificationTask, this.hasClassificationTask),
    ];
  }

  public showModal() {
    this.helpDialogElement.showModal();
    this.dispatchEvent(new CustomEvent("open"));
  }

  public closeModal(): void {
    this.dispatchEvent(new CustomEvent("close"));
    // TODO: I have temporarily disabled this line for DX purposes
    // localStorage.setItem(helpPreferenceLocalStorageKey, "true");
    this.helpDialogElement.close();
  }

  private renderSlide(slide: AbstractSlide): HTMLTemplateResult {
    return html`
      <p>${slide.description}</p>
      ${when(
        slide.isSvg,
        () => html`<svg class="slide" viewBox="-10 0 390 230">${slide.render()}</svg>`,
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
          <div class="dialog-header">
            <h2>Information</h2>
            <button class="close-button">x</button>
          </div>

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
