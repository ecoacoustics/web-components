import { customElement, property, query } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, PropertyValues, unsafeCSS } from "lit";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { classMap } from "lit/directives/class-map.js";
import { provide } from "@lit/context";
import { ALT_KEY, ENTER_KEY } from "../../helpers/keyboard";
import { decisionColors } from "../../helpers/themes/decisionColors";
import { SubjectWrapper } from "../../models/subject";
import { Decision } from "../../models/decisions/decision";
import { SubjectChange } from "../verification-grid/verification-grid";
import { hasCtrlLikeModifier } from "../../helpers/userAgentData/userAgent";
import { gridTileContext } from "../../helpers/constants/contextTokens";
import { Tag } from "../../models/tag";
import { templateContent } from "lit/directives/template-content.js";
import { hasClickLikeEventListener } from "../../patches/addEventListener/addEventListener";
import verificationGridTileStyles from "./css/style.css?inline";

export const requiredVerificationPlaceholder = Symbol("requiredVerificationPlaceholder");
export const requiredNewTagPlaceholder = Symbol("requiredNewTagPlaceholder");

export type RequiredVerification = typeof requiredVerificationPlaceholder;
export type RequiredNewTag = typeof requiredNewTagPlaceholder;
export type RequiredClassification = Tag;
export type RequiredDecision = RequiredVerification | RequiredClassification | RequiredNewTag;

export type OverflowEvent = CustomEvent<OverflowEventDetail>;
export type LoadedEvent = CustomEvent;

export interface VerificationGridTileContext {
  model: SubjectWrapper;
  requiredDecisions: RequiredDecision[];
}

interface OverflowEventDetail {
  isOverlapping: boolean;
}

// cspell:disable-next-line
const shortcutOrder = "1234567890qwertyuiopasdfghjklzxcvbnm";
const shortcutTranslation = {
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
} as const satisfies Record<string, string>;

/**
 * @description
 * A component to scope ids to a template inside a shadow DOM
 * This component will be used by the verification-grid component but will
 * probably not be used by users
 * It can also manage the selection state
 *
 * @slot tile-header - The template to be rendered inside the grid tile
 * @slot - The default slot used to render the main content of the grid tile
 *
 * @cssproperty [--decision-color] - The border color that is applied when a
 * decision is being shown
 *
 * @event oe-selected
 * @event oe-tile-loading
 * @event oe-tile-loaded
 */
@customElement("oe-verification-grid-tile")
export class VerificationGridTileComponent extends AbstractComponent(LitElement) {
  public static styles = [unsafeCSS(verificationGridTileStyles), decisionColors];

  public static readonly selectedEventName = "oe-selected";
  public static readonly loadingEventName = "oe-tile-loading";
  public static readonly loadedEventName = "oe-tile-loaded";

  // Because this is not a user-facing component, I do not expect that this
  // component will be used outside of a verification grid, and we can therefore
  // ensure that the tile context is always provided.
  @provide({ context: gridTileContext })
  @property({ attribute: false })
  public tile!: VerificationGridTileContext;

  @property({ attribute: false, type: Boolean })
  public showKeyboardShortcuts = false;

  @property({ attribute: false, type: Boolean })
  public selected = false;

  /**
   * The index position of the tile within a verification grid that is used
   * to determine the selection keyboard shortcut associated with the grid tile
   */
  @property({ attribute: false, type: Number })
  public index = 0;

  /**
   * A property that can be set if the grid tile is the only tile in the
   * verification grid.
   * This is useful for disabling selection events and styling.
   */
  @property({ attribute: false, type: Boolean })
  public singleTileViewMode = false;

  @property({ attribute: false, type: Array })
  public readonly requiredDecisions: RequiredDecision[] = [];

  @property({ attribute: false, type: Boolean })
  public isOverlapping = false;

  @property({ attribute: false, type: Object })
  public tileTemplate!: HTMLTemplateElement;

  // The spectrogram might not be present if the user provides a custom template
  // without a spectrogram (e.g. for an image verification task).
  @query("oe-spectrogram")
  private spectrogram?: SpectrogramComponent;

  @query("#template-content", true)
  private templateContent!: HTMLDivElement;

  @query("#contents-wrapper")
  private contentsWrapper!: HTMLDivElement;

  private readonly keyDownHandler = this.handleKeyDown.bind(this);
  private readonly loadingHandler = this.handleLoading.bind(this);
  private readonly loadedHandler = this.handleLoaded.bind(this);

  public loaded = false;
  private shortcuts: string[] = [];
  private intersectionObserver!: IntersectionObserver;

  public get taskCompleted(): boolean {
    return this.requiredDecisions.every((requiredDecision) => {
      if (requiredDecision === requiredVerificationPlaceholder) {
        return this.model.verification !== undefined;
      } else if (requiredDecision === requiredNewTagPlaceholder) {
        return this.model.newTag !== undefined;
      }

      return this.model.classifications.has(requiredDecision.text);
    });
  }

  public get model(): SubjectWrapper {
    return this.tile.model;
  }

  /**
   * An override of the default HTMLElement focus() method so that
   * tab index's and location is consistent.
   */
  public override focus() {
    this.contentsWrapper.focus();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("keydown", this.keyDownHandler);
  }

  public disconnectedCallback(): void {
    document.removeEventListener("keydown", this.keyDownHandler);

    if (this.spectrogram) {
      this.templateContent.removeEventListener(SpectrogramComponent.loadingEventName, this.loadingHandler);
      this.templateContent.removeEventListener(SpectrogramComponent.loadedEventName, this.loadedHandler);
    }

    this.intersectionObserver.disconnect();

    super.disconnectedCallback();
  }

  public firstUpdated(): void {
    // We add event listeners to the templateContent wrapper instead of the
    // spectrogram directly because it's hard to guarantee that we can attach
    // the event listeners to the templated spectrograms before the spectrogram
    // finishes loading.
    this.templateContent.addEventListener(SpectrogramComponent.loadingEventName, this.loadingHandler);
    this.templateContent.addEventListener(SpectrogramComponent.loadedEventName, this.loadedHandler);

    if (this.spectrogram) {
      this.spectrogram.src = this.model.url;
    }

    console.debug("oe-verification-grid-tile: firstUpdated");
    this.intersectionObserver = new IntersectionObserver((entries) => this.handleIntersection(entries), {
      root: this,
      // a threshold of zero indicates that we should trigger the callback if
      // any part of the observed elements overflow the component
      threshold: 0,
    });

    // we observe the slot wrapper because it has user defined content, meaning
    // that it can overflow in any way possible
    // we want to detect when content overflows the tile so that we can try a
    // different grid size
    //
    // we observe the content wrapper because it can overflow when the
    // spectrograms minimum height/width is reached
    this.intersectionObserver.observe(this.templateContent);
    this.intersectionObserver.observe(this.contentsWrapper);
  }

  public willUpdate(change: PropertyValues<this>): void {
    const spectrogramInvalidationKeys: (keyof VerificationGridTileComponent)[] = ["tile", "tileTemplate"];
    if (spectrogramInvalidationKeys.some((key) => change.has(key)) && this.spectrogram && this.model.url) {
      this.spectrogram.src = this.model.url;
    }

    if (this.index > shortcutOrder.length) {
      this.shortcuts = [];
    }

    const shortcutKey = shortcutOrder[this.index];

    // we use a type guard here because TypeScript inlining the type check of
    // the shortcutTranslation object does not narrow the type of the
    // shortcutKey variable
    if (this.hasAlternativeShortcut(shortcutKey)) {
      this.shortcuts = [shortcutKey, shortcutTranslation[shortcutKey]];
    } else {
      this.shortcuts = [shortcutKey];
    }
  }

  public updateSubject(subject: SubjectWrapper): void {
    this.tile.model = subject;
    this.tile.requiredDecisions = this.requiredDecisions;
  }

  public resetSettings(): void {
    if (this.spectrogram) {
      this.spectrogram.resetSettings();
    }
  }

  public addDecision(decision: Decision): SubjectChange {
    return this.model.addDecision(decision);
  }

  public removeDecision(decision: Decision): SubjectChange {
    return this.model.removeDecision(decision);
  }

  // TODO: The hasVerificationTask, hasNewTagTask and requiredClassificationTags
  // parameters should be derived from this verification grid tile's model
  // instead of requiring the verification grid tile to provide them.
  // By moving these parameters to be derived from the model, we would isolate
  // the decision meter to this component, meaning that the verification grid
  // would not need to know about the required decisions for each tile.
  public skipUndecided(
    hasVerificationTask: boolean,
    hasNewTagTask: boolean,
    requiredClassificationTags: Tag[],
  ): SubjectChange {
    return this.model.skipUndecided(hasVerificationTask, hasNewTagTask, requiredClassificationTags);
  }

  private hasAlternativeShortcut(shortcut: string): shortcut is keyof typeof shortcutTranslation {
    return shortcut in shortcutTranslation;
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    const hasOverlapContent = entries.some((entry) => entry.intersectionRatio < 1);

    this.isOverlapping = hasOverlapContent;

    const overlapEvent = new CustomEvent<OverflowEventDetail>("overlap", {
      detail: {
        isOverlapping: hasOverlapContent,
      },
      bubbles: true,
    });
    this.dispatchEvent(overlapEvent);
  }

  // this method is called when the spectrogram starts rendering
  private handleLoading(): void {
    this.loaded = false;
  }

  // this method is called when the spectrogram finishes rendering
  private handleLoaded(): void {
    this.loaded = true;
    this.dispatchEvent(new CustomEvent<LoadedEvent>(VerificationGridTileComponent.loadedEventName, { bubbles: true }));
  }

  private handleFocusedKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case ENTER_KEY: {
        this.dispatchSelectedEvent(event);
        break;
      }
    }
  }

  // we use keydown instead of keyup because keyup events are not registered
  // in MacOS when the command key is held down
  // https://stackoverflow.com/q/11818637
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.altKey && this.shortcuts.includes(event.key.toLowerCase())) {
      // Because Alt + number is used to switch tabs in browsers, we
      // preventDefault so that the tab doesn't lose focus during alt + number
      // selection.
      event.preventDefault();

      this.dispatchEvent(
        new CustomEvent(VerificationGridTileComponent.selectedEventName, {
          bubbles: true,
          detail: {
            index: this.index,
            shiftKey: event.shiftKey,
            ctrlKey: hasCtrlLikeModifier(event),
          },
        }),
      );
    }
  }

  private dispatchSelectedEvent(event: PointerEvent | KeyboardEvent): void {
    if (this.singleTileViewMode) {
      return;
    }

    // If the click was performed on a link with a href, we should not select
    // the tile because the user is probably trying to follow the link.
    // Note that not all links result in a page navigation, for example,
    // if a link has target="_blank", it will open a new tab in which case we do
    // not want to select the tile.
    // Links that have action as the result of an event listener should be
    // handled below.
    if (event.target instanceof HTMLAnchorElement && event.target.href) {
      return;
    }

    for (const element of event.composedPath()) {
      if (element === this.contentsWrapper) {
        break;
      }

      if (hasClickLikeEventListener(element)) {
        return;
      }
    }

    this.dispatchEvent(
      new CustomEvent(VerificationGridTileComponent.selectedEventName, {
        bubbles: true,
        detail: {
          index: this.index,
          shiftKey: event.shiftKey,
          ctrlKey: hasCtrlLikeModifier(event),
        },
      }),
    );
  }

  private keyboardShortcutTemplate(): HTMLTemplateResult {
    return html`
      <div class="keyboard-hint ${classMap({ hidden: !this.showKeyboardShortcuts })}">
        <kbd>${this.shortcuts.at(0)}</kbd>
      </div>
    `;
  }

  public render() {
    const tileClasses = classMap({
      selected: this.selected,
      selectable: !this.singleTileViewMode,
    });

    // use a pointerdown event instead of a click event because MacOS doesn't
    // trigger a click event if someone shift clicks on a tile
    return html`
      <div
        id="contents-wrapper"
        class="tile-container vertically-fill ${tileClasses}"
        part="tile-container"
        role="button"
        tabindex="${this.singleTileViewMode ? -1 : 1}"
        aria-keyshortcuts="${ALT_KEY}+${this.shortcuts.join(",")}"
        @keydown="${this.handleFocusedKeyDown}"
        @pointerdown="${this.dispatchSelectedEvent}"
      >
        ${this.keyboardShortcutTemplate()}
        <figure class="spectrogram-container vertically-fill">
          <div id="template-content" class="vertically-fill">${templateContent(this.tileTemplate)}</div>
        </figure>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-verification-grid-tile": VerificationGridTileComponent;
  }
}
