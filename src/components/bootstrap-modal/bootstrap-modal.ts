import { customElement, property, query } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { DecisionComponent } from "../decision/decision";
import { SelectionObserverType } from "verification-grid/verification-grid";
import { AbstractSlide } from "./slides/abstractSlide";
import { when } from "lit/directives/when.js";
import { DecisionsSlide } from "./slides/decisions/decisions";
import { PagingSlide } from "./slides/paging/paging";
import { SelectionSlide } from "./slides/selection/selection";
import { ShortcutsSlide } from "./slides/shortcuts/shortcuts";
import { loop } from "../../helpers/directives";
import { Tag } from "../../models/tag";
import helpDialogStyles from "./css/style.css?inline";

// TOOD: These should probably move somewhere else
import decisionSlideAnimations from "./slides/decisions/animations.css?inline";
import pagingSlideAnimations from "./slides/paging/animations.css?inline";
import selectionSlideAnimations from "./slides/selection/animations.css?inline";
import shortcutSlideAnimations from "./slides/shortcuts/animations.css?inline";

import decisionSlideStyles from "./slides/decisions/styles.css?inline";
import pagingSlideStyles from "./slides/paging/styles.css?inline";
import selectionSlideStyles from "./slides/selection/styles.css?inline";
import shortcutSlideStyles from "./slides/shortcuts/styles.css?inline";

export interface KeyboardShortcut {
  keys: string[];
  description: string;
}

/*
  A local storage key that when set, will cause the bootstrap modal not to open
  on load.
  This does not prevent the modal from being opened manually through the
  verification grids information icon or the bootstraps open() method.
*/
const bypassBootstrapLocalStorageKey = "oe-bypass-bootstrap";

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

    unsafeCSS(decisionSlideAnimations),
    unsafeCSS(pagingSlideAnimations),
    unsafeCSS(selectionSlideAnimations),
    unsafeCSS(shortcutSlideAnimations),

    unsafeCSS(decisionSlideStyles),
    unsafeCSS(pagingSlideStyles),
    unsafeCSS(selectionSlideStyles),
    unsafeCSS(shortcutSlideStyles),
  ];

  @property({ type: Array, attribute: false })
  public decisionElements!: DecisionComponent[];

  @property({ type: String, attribute: false })
  public selectionBehavior!: SelectionObserverType;

  @property({ type: Boolean, attribute: false })
  public isMobile!: boolean;

  @property({ type: Boolean, attribute: false })
  public hasVerificationTask!: boolean;

  @property({ type: Array, attribute: false })
  public classificationTasks!: Tag[];

  @query("#dialog-element")
  private dialogElement!: HTMLDialogElement;

  public get open(): boolean {
    return this.dialogElement.open;
  }

  public get hasClassificationTask(): boolean {
    return this.classificationTasks.length > 0;
  }

  public get decisionShortcuts(): KeyboardShortcut[] {
    if (!this.decisionElements) {
      return [];
    }

    return this.decisionElements.flatMap((element) => element.shortcutKeys());
  }

  private slides: AbstractSlide[] = [];

  public firstUpdated(): void {
    const shouldShowHelpDialog = localStorage.getItem(bypassBootstrapLocalStorageKey) === null;

    if (shouldShowHelpDialog) {
      this.showModal();
    }
  }

  public updated(): void {
    this.slides = [
      // new DecisionsSlide(this.hasVerificationTask, this.hasClassificationTask, this.decisionElements),
      // new SelectionSlide(),
      // new PagingSlide(),

      new PagingSlide(),
      new SelectionSlide(),
      // new DecisionsSlide(this.hasVerificationTask, this.hasClassificationTask, this.decisionElements),
    ];

    // if the user is on a or tablet device, we don't need to bother showing
    // the keyboard shortcuts slide
    // by conditionally adding it to the slides array, we can reduce the amount
    // of information that needs to be consumed by the user
    if (!this.isMobile) {
      this.slides.push(new ShortcutsSlide(this.decisionShortcuts));
    }
  }

  public showModal() {
    this.dialogElement.showModal();
    this.dispatchEvent(new CustomEvent("open"));
  }

  public closeModal(): void {
    this.dispatchEvent(new CustomEvent("close"));
    // TODO: I have temporarily disabled this line for DX purposes
    // localStorage.setItem(helpPreferenceLocalStorageKey, "true");
    this.dialogElement.close();
  }

  private renderSlide(slide: AbstractSlide): HTMLTemplateResult {
    return html`
      <div class="slide-content">
        <p class="slide-description">${slide.description}</p>
        ${slide.render()}
      </div>
    `;
  }

  private slidesTemplate(): HTMLTemplateResult {
    return html`
      <sl-carousel class="carousel" navigation pagination mouse-dragging>
        ${loop(
          this.slides,
          (slide, { last }) => html`
            <sl-carousel-item class="carousel-item">
              ${this.renderSlide(slide)}
              <div class="slide-footer">
                ${when(
                  last,
                  () => html`<button class="oe-btn-primary begin-button" @click="${this.closeModal}">Begin</button>`,
                )}
              </div>
            </sl-carousel-item>
          `,
        )}
      </sl-carousel>
    `;
  }

  public render(): HTMLTemplateResult {
    return html`
      <dialog id="dialog-element" @pointerdown="${() => this.dialogElement.close()}" @close="${this.closeModal}">
        <section class="dialog-section" @pointerdown="${(event: PointerEvent) => event.stopPropagation()}">
          <header class="dialog-header">
            <h2 class="dialog-title">Information</h2>
            <button class="oe-btn-secondary close-button" @click="${this.closeModal}">x</button>
          </header>

          <div class="dialog-content">${this.slidesTemplate()}</div>
        </section>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-verification-bootstrap": VerificationBootstrapComponent;
  }
}
