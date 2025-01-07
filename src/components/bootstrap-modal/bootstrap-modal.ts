import { customElement, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { DecisionComponent } from "../decision/decision";
import { SelectionObserverType } from "verification-grid/verification-grid";
import { when } from "lit/directives/when.js";
import { loop } from "../../helpers/directives";
import { Tag } from "../../models/tag";
import { KeyboardShortcut } from "../../templates/keyboard";
import { BootstrapSlide } from "./slides/abstractSlide";
import { advancedShortcutsSlide } from "./slides/advanced-shortcuts/advanced-shortcuts";
import { decisionsSlide } from "./slides/decisions/decisions";
import { selectionSlide } from "./slides/selection/selection";
import { pagingSlide } from "./slides/paging/paging";
import { shortcutsSlide } from "./slides/shortcuts/shortcuts";
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
  public static styles = [
    unsafeCSS(helpDialogStyles),

    unsafeCSS(decisionSlideStyles),
    unsafeCSS(pagingSlideStyles),
    unsafeCSS(selectionSlideStyles),
    unsafeCSS(shortcutSlideStyles),
    unsafeCSS(advancedShortcutStyles),
  ];

  // because this is an internal web component, we can use the state decorator
  // because it doesn't matter if the property name is minified
  // we would usually use a property decorator for public properties because the
  // property name is important to people using the web component
  // however, in this case we are not exposing the properties to the client host
  @state()
  public decisionElements!: DecisionComponent[];

  @state()
  public selectionBehavior!: SelectionObserverType;

  @state()
  public hasVerificationTask!: boolean;

  @state()
  public hasClassificationTask!: boolean;

  @state()
  public classificationTasks!: Tag[];

  @state()
  public isMobile!: boolean;

  @state()
  private slides: BootstrapSlide[] = [];

  @query("#dialog-element")
  private dialogElement!: HTMLDialogElement;

  public get open(): boolean {
    return this.dialogElement.open;
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
      this.showTutorialModal();
    }
  }

  public showAdvancedModal(): void {
    this.slides = [advancedShortcutsSlide()];
    this.showModal();
  }

  public showTutorialModal(): void {
    this.slides = [
      decisionsSlide(this.hasVerificationTask, this.hasClassificationTask, this.demoDecisionButton),
      selectionSlide(this.demoDecisionButton, this.hasClassificationTask),
      pagingSlide(),
    ];

    // if the user is on a or tablet device, we don't need to bother showing
    // the keyboard shortcuts slide
    // by conditionally adding it to the slides array, we can reduce the amount
    // of information that needs to be consumed by the user
    if (!this.isMobile) {
      this.slides.push(shortcutsSlide(this.decisionShortcuts, this.hasClassificationTask));
    }

    this.showModal();
  }

  public closeModal(): void {
    this.dispatchEvent(new CustomEvent("close"));
    localStorage.setItem(autoDismissBootstrapStorageKey, "true");
    this.dialogElement.close();
  }

  // this method is private because you should be explicitly opening the modal
  // through the showAdvancedModal
  private showModal(): void {
    this.dialogElement.showModal();
    this.dispatchEvent(new CustomEvent("open"));
  }

  public positiveDecisionColor(): string {
    return this.hasClassificationTask ? "red" : "green";
  }

  public negativeDecisionColor(): string {
    return this.hasClassificationTask ? "maroon" : "red";
  }

  private renderSlide(slide: BootstrapSlide): HTMLTemplateResult {
    return html`
      <div
        class="slide-content"
        style="
          --positive-color: ${this.positiveDecisionColor()};
          --negative-color: ${this.negativeDecisionColor()};
        "
      >
        <h2 class="slide-description">${slide.description}</h2>
        ${slide.slideTemplate}
      </div>
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
      <sl-carousel class="carousel" navigation pagination mouse-dragging>
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
    console.debug("re-rendering", this.hasVerificationTask, this.hasClassificationTask);
    return html`
      <dialog id="dialog-element" @pointerdown="${() => this.dialogElement.close()}" @close="${this.closeModal}">
        <section class="dialog-section" @pointerdown="${(event: PointerEvent) => event.stopPropagation()}">
          <header class="dialog-header">
            <button
              class="oe-btn-secondary close-button"
              @click="${this.closeModal}"
              data-testid="dismiss-bootstrap-dialog-btn"
            >
              x
            </button>
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
