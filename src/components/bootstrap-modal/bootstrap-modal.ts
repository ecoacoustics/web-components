import { customElement, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { DecisionComponent } from "../decision/decision";
import { when } from "lit/directives/when.js";
import { loop } from "../../helpers/directives";
import { KeyboardShortcut } from "../../templates/keyboardShortcut";
import { BootstrapSlide } from "./slides/bootstrapSlide";
import { advancedShortcutsSlide } from "./slides/advanced-shortcuts/advanced-shortcuts";
import { decisionsSlide } from "./slides/decisions/decisions";
import { selectionSlide } from "./slides/selection/selection";
import { pagingSlide } from "./slides/paging/paging";
import { shortcutsSlide } from "./slides/shortcuts/shortcuts";
import { ClassificationComponent } from "../decision/classification/classification";
import { consume } from "@lit/context";
import { VerificationGridInjector } from "verification-grid/verification-grid";
import { injectionContext } from "../../helpers/constants/contextTokens";
import { decisionColors } from "../../helpers/themes/decisionColors";
import { SlCarousel } from "@shoelace-style/shoelace";
import bootstrapDialogStyles from "./css/style.css?inline";

// styles for individual slides
import decisionSlideStyles from "./slides/decisions/styles.css?inline";
import pagingSlideStyles from "./slides/paging/styles.css?inline";
import selectionSlideStyles from "./slides/selection/styles.css?inline";
import shortcutSlideStyles from "./slides/shortcuts/styles.css?inline";
import advancedShortcutStyles from "./slides/advanced-shortcuts/styles.css?inline";

/*
  A local storage key that when set, will cause the bootstrap modal to not
  automatically open on load.
  This does not prevent the modal from being opened manually through the
  verification grids information icon or the bootstraps open() method.
*/
const autoDismissBootstrapStorageKey = "oe-auto-dismiss-bootstrap";

/**
 * @description
 * A dialog that contains informative animations about the verification grid and
 * how to use it.
 *
 * @event open - Dispatched when the dialog is opened
 * @event close - Dispatched when the dialog is closed
 */
@customElement("oe-verification-bootstrap")
export class VerificationBootstrapComponent extends AbstractComponent(LitElement) {
  public static styles = [
    unsafeCSS(bootstrapDialogStyles),
    decisionColors,

    unsafeCSS(decisionSlideStyles),
    unsafeCSS(pagingSlideStyles),
    unsafeCSS(selectionSlideStyles),
    unsafeCSS(shortcutSlideStyles),
    unsafeCSS(advancedShortcutStyles),
  ];

  @consume({ context: injectionContext, subscribe: true })
  @state()
  protected injector!: VerificationGridInjector;

  // because this is an internal web component, we can use the state decorator
  // because it doesn't matter if the property name is minified
  // we would usually use a property decorator for public properties because the
  // property name is important to people using the web component
  // however, in this case we are not exposing the properties to the client host
  @state()
  public decisionElements!: DecisionComponent[];

  @state()
  public hasVerificationTask!: boolean;

  @state()
  public hasClassificationTask!: boolean;

  @state()
  public isMobile!: boolean;

  @state()
  private slides: BootstrapSlide[] = [];

  @query("#dialog-element")
  private dialogElement!: HTMLDialogElement;

  @query("#tutorial-slide-carousel")
  private tutorialSlideCarouselElement!: SlCarousel;

  public get open(): Readonly<boolean> {
    return this.dialogElement.open;
  }

  private get decisionShortcuts(): ReadonlyArray<KeyboardShortcut> {
    return this.decisionElements.flatMap((element) => element.shortcutKeys());
  }

  // the demo decision button can be undefined if the user creates a verification
  // grid with no decision buttons
  private get demoDecisionButton(): Readonly<DecisionComponent | undefined> {
    // In the bootstrap slide animations, we show how to use a decision button
    // by displaying the first decision button inside the bootstrap animations.
    //
    // We do not show all the decision elements inside the bootstrap animations
    // in an attempt to reduce clutter, and make the animations easier to code.
    //
    // Only having one decision button is easier because we always know where it
    // will be inside the svg animation, meaning that when we animate the mouse
    // clicking on the decision button, we always know where it will be.
    return this.decisionElements[0];
  }

  private get isClassificationDemo(): Readonly<boolean> {
    return this.demoDecisionButton instanceof ClassificationComponent;
  }

  public firstUpdated(): void {
    const shouldOpenDialog = localStorage.getItem(autoDismissBootstrapStorageKey) === null;
    if (shouldOpenDialog) {
      this.showTutorialDialog();
    }
  }

  public showTutorialDialog(): void {
    const slides: BootstrapSlide[] = [
      decisionsSlide(this.hasVerificationTask, this.hasClassificationTask, this.demoDecisionButton),
      selectionSlide(this.hasClassificationTask, this.demoDecisionButton),
      pagingSlide(),
    ];

    // if the user is on a mobile device, we don't need to bother showing
    // the keyboard shortcuts slide
    // by conditionally adding it to the slides array, we can reduce the amount
    // of information that needs to be consumed by the user
    //
    // additionally, if there are no decision shortcut keys, we don't display
    // the shortcut bootstrap slide
    if (!this.isMobile && this.decisionShortcuts.length > 0) {
      slides.push(shortcutsSlide(this.decisionShortcuts, this.hasClassificationTask));
    }

    this.showDialog(slides);

    // Whenever the dialog is opened, we want to reset the slide carousel back
    // to the start so that if the user re-opens the bootstrap modal through the
    // verification grids "help" button or the "showTutorialDialog()" method,
    // the tutorial will start from the beginning again.
    // If we did not reset the tutorial carousel back to the start, the tutorial
    // would start from the slide they close it on.
    this.tutorialSlideCarouselElement.goToSlide(0);
  }

  public showAdvancedDialog(): void {
    const slides = [advancedShortcutsSlide()];
    this.showDialog(slides);
  }

  private closeDialog(): void {
    localStorage.setItem(autoDismissBootstrapStorageKey, "true");
    this.dialogElement.close();
    this.dispatchEvent(new CustomEvent("close"));
  }

  // this method is private because you should be explicitly opening the modal
  // through the showTutorialDialog() and showAdvancedDialog() methods
  private showDialog(slides: BootstrapSlide[]): void {
    this.slides = slides;
    this.dialogElement.showModal();
    this.dispatchEvent(new CustomEvent("open"));
  }

  private positiveDecisionColor(): Readonly<string> {
    return this.isClassificationDemo ? "var(--class-0-true)" : "var(--verification-true)";
  }

  private negativeDecisionColor(): Readonly<string> {
    return this.isClassificationDemo ? "var(--class-0-false)" : "var(--verification-false)";
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
        <h2 class="slide-title">${slide.title}</h2>
        ${slide.slideTemplate}
      </div>
    `;
  }

  private slideFooterTemplate(): HTMLTemplateResult {
    // TODO: Find a better way to do this
    if (this.slides.length === 1) {
      return html`<button class="oe-btn-secondary" @click="${this.showTutorialDialog}">Replay tutorial</button>`;
    }

    return html`<button class="oe-btn-primary" @click="${this.closeDialog}">Get started</button>`;
  }

  private slidesTemplate(): HTMLTemplateResult {
    if (!this.slides?.length) {
      return html`<strong>No slides to display</strong>`;
    }

    // If there is only one slide in the carousel, we don't need to show the
    // navigation arrows, the pagination bubbles, or enable mouse dragging
    // support.
    // By disabling these features, we get more room on smaller screens and
    // remove UI elements that can cause confusion when there is only one
    // bootstrap slide.
    const showCarouselPagination = this.slides.length > 1;

    return html`
      <sl-carousel
        id="tutorial-slide-carousel"
        class="carousel"
        ?navigation="${showCarouselPagination}"
        ?pagination="${showCarouselPagination}"
        ?mouse-dragging="${showCarouselPagination}"
      >
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
      <dialog id="dialog-element" @pointerdown="${() => this.closeDialog()}">
        <div class="dialog-container" @pointerdown="${(event: PointerEvent) => event.stopPropagation()}">
          <header class="dialog-header">
            <button
              class="oe-btn-secondary close-button"
              @click="${() => this.closeDialog()}"
              data-testid="dismiss-bootstrap-dialog-btn"
            >
              x
            </button>
          </header>

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
