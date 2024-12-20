import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, PropertyValues, unsafeCSS } from "lit";
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
import { AdvancedShortcutsSlide } from "./slides/advanced-shortcuts/advanced-shortcuts";
import { KeyboardShortcut } from "../../templates/keyboard";
import helpDialogStyles from "./css/style.css?inline";

// styles for individual slides
import decisionSlideStyles from "./slides/decisions/styles.css?inline";
import pagingSlideStyles from "./slides/paging/styles.css?inline";
import selectionSlideStyles from "./slides/selection/styles.css?inline";
import shortcutSlideStyles from "./slides/shortcuts/styles.css?inline";
import advancedShortcutStyles from "./slides/advanced-shortcuts/styles.css?inline";

/*
  A local storage key that when set, will cause the bootstrap modal not to open
  on load.
  This does not prevent the modal from being opened manually through the
  verification grids information icon or the bootstraps open() method.
*/
const autoDismissBootstrapStorageKey = "oe-auto-dismiss-bootstrap";

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
    unsafeCSS(advancedShortcutStyles),
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

  @state()
  private slides: AbstractSlide[] = [];

  @state()
  private showReplayButton = false;

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

  private get demoDecisionButton(): DecisionComponent {
    return this.decisionElements[0];
  }

  public firstUpdated(): void {
    const shouldShowHelpDialog = localStorage.getItem(autoDismissBootstrapStorageKey) === null;

    if (shouldShowHelpDialog) {
      // this.showTutorialModal();
      this.showAdvancedModal();
    }
  }

  public updated(change: PropertyValues<this>): void {
    const invalidationKeys: (keyof this)[] = [
      "hasVerificationTask",
      "classificationTasks",
      "isMobile",
      "selectionBehavior",
      "decisionElements",
    ];

    if (invalidationKeys.some((key) => change.has(key as any))) {
      this.updateSlides();

      // TODO: DON'T REVIEW THIS
      this.handleSlideChange({ detail: { index: 0 } } as CustomEvent<{ index: number }>);
    }
  }

  public showAdvancedModal(): void {
    this.slides = [new AdvancedShortcutsSlide()];
    this.showModal();
  }

  public showTutorialModal(): void {
    this.slides = [
      // new DecisionsSlide(this.hasVerificationTask, this.hasClassificationTask, this.decisionElements),
      // new SelectionSlide(this.demoDecisionButton),
      // new PagingSlide(),

      new SelectionSlide(this.demoDecisionButton),
      new ShortcutsSlide(this.decisionShortcuts),
      new DecisionsSlide(this.hasVerificationTask, this.hasClassificationTask, this.demoDecisionButton),
      new PagingSlide(),
    ];

    // if the user is on a or tablet device, we don't need to bother showing
    // the keyboard shortcuts slide
    // by conditionally adding it to the slides array, we can reduce the amount
    // of information that needs to be consumed by the user
    if (!this.isMobile) {
      this.slides.push(new ShortcutsSlide(this.decisionShortcuts));
    }

    this.showModal();
  }

  public closeModal(): void {
    this.dispatchEvent(new CustomEvent("close"));
    // localStorage.setItem(autoDismissBootstrapStorageKey, "true");
    this.dialogElement.close();
  }

  private handleSlideChange(event: CustomEvent<{ index: number }>): void {
    const index = event.detail.index;
    if (index < 0 && index < this.slides.length) {
      console.warn("Invalid slide index", index);
      return;
    }

    const slide = this.slides[index];
    this.showReplayButton = slide.hasAnimations;
  }

  // this method is private because you should be explicitly opening the modal
  // through the showAdvancedModal
  private showModal(): void {
    this.dialogElement.showModal();
    this.dispatchEvent(new CustomEvent("open"));
  }

  private updateSlides(): void {
    this.requestUpdate();
  }

  private renderSlide(slide: AbstractSlide): HTMLTemplateResult {
    return html`
      <div class="slide-content">
        <h2 class="slide-description">${slide.description}</h2>
        ${slide.render()}
      </div>
    `;
  }

  private repeatPromptTemplate(): HTMLTemplateResult {
    return html`
      <button class="repeat-prompt oe-btn-secondary">
        <sl-icon name="arrow-repeat" class="repeat-icon large-icon"></sl-icon>
        Replay
      </button>
    `;
  }

  private slideFooterTemplate(): HTMLTemplateResult {
    // TODO: Find a better way to do this
    if (this.slides.length === 1) {
      return html`<button class="oe-btn-secondary" @click="${this.showTutorialModal}">Replay tutorial</button>`;
    }

    return html`<button class="oe-btn-primary" @click="${this.closeModal}">Get started</button>`;
  }

  private slidesTemplate(): HTMLTemplateResult {
    if (!this.slides?.length) {
      return html`<strong>No slides to display</strong>`;
    }

    // we do not need a carousel if there is only one slide
    if (this.slides.length === 1) {
      const slide = this.slides[0];
      return html`
        <div class="carousel">
          <sl-carousel-item class="carousel-item">
            ${this.renderSlide(slide)}
            <div class="slide-footer">${this.slideFooterTemplate()}</div>
          </sl-carousel-item>
        </div>
      `;
    }

    return html`
      <sl-carousel @sl-slide-change="${this.handleSlideChange}" class="carousel" navigation pagination mouse-dragging>
        ${loop(
          this.slides,
          (slide, { last }) => html`
            <sl-carousel-item class="carousel-item">
              ${this.renderSlide(slide)}
              <div class="slide-footer">${when(last, () => this.slideFooterTemplate())}</div>
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
            ${when(this.showReplayButton, () => this.repeatPromptTemplate())}
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
