import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { classMap } from "lit/directives/class-map.js";
import { consume, provide } from "@lit/context";
import { booleanConverter } from "../../helpers/attributes";
import { ALT_KEY, ENTER_KEY } from "../../helpers/keyboard";
import { decisionColors } from "../../helpers/themes/decisionColors";
import { SubjectWrapper } from "../../models/subject";
import { Decision, DecisionOptions } from "../../models/decisions/decision";
import { SignalWatcher, watch } from "@lit-labs/preact-signals";
import { VerificationGridInjector, VerificationGridSettings } from "../verification-grid/verification-grid";
import { when } from "lit/directives/when.js";
import { repeat } from "lit/directives/repeat.js";
import { hasCtrlLikeModifier } from "../../helpers/userAgentData/userAgent";
import { ifDefined } from "lit/directives/if-defined.js";
import { gridTileContext, injectionContext, verificationGridContext } from "../../helpers/constants/contextTokens";
import { Tag } from "../../models/tag";
import { WithShoelace } from "../../mixins/withShoelace";
import { decisionNotRequired } from "../../models/decisions/decisionNotRequired";
import verificationGridTileStyles from "./css/style.css?inline";

export const requiredVerificationPlaceholder = Symbol("requiredVerificationPlaceholder");
export const requiredNewTagPlaceholder = Symbol("requiredNewTagPlaceholder");

export type RequiredVerification = typeof requiredVerificationPlaceholder;
export type RequiredNewTag = typeof requiredNewTagPlaceholder;
export type RequiredClassification = Tag;
export type RequiredDecision = RequiredVerification | RequiredClassification | RequiredNewTag;

export type OverflowEvent = CustomEvent<OverflowEventDetail>;
export type LoadedEvent = CustomEvent;

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
 * @slot - The template to be rendered inside the grid tile
 *
 * @cssproperty [--decision-color] - The border color that is applied when a
 * decision is being shown
 *
 * @event oe-selected
 * @event oe-tile-loaded
 */
@customElement("oe-verification-grid-tile")
export class VerificationGridTileComponent extends SignalWatcher(WithShoelace(AbstractComponent(LitElement))) {
  public static styles = [unsafeCSS(verificationGridTileStyles), decisionColors];

  public static readonly selectedEventName = "oe-selected";
  public static readonly loadedEventName = "oe-tile-loaded";

  @provide({ context: gridTileContext })
  @property({ attribute: false })
  public model!: SubjectWrapper;

  @consume({ context: verificationGridContext, subscribe: true })
  @state()
  private settings!: VerificationGridSettings;

  @consume({ context: injectionContext, subscribe: true })
  @state()
  private injector!: VerificationGridInjector;

  /**
   * Hides a grid tile. This is useful for virtual paging so if you have a
   * grid of tiles where not all have a source, you can hide the ones that
   * do not have a source instead of destroying them completely as they might
   * be used in the future when paging back in history or the grid size is
   * increased.
   */
  @property({ type: Boolean, converter: booleanConverter, reflect: true })
  public hidden = false;

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
  public isOnlyTile = false;

  @property({ attribute: false, type: Array })
  public readonly requiredDecisions: RequiredDecision[] = [];

  @property({ attribute: false, type: Boolean })
  public isOverlapping = false;

  @query("oe-spectrogram")
  private spectrogram!: SpectrogramComponent;

  @query("#slot-wrapper")
  private slotWrapper!: HTMLDivElement;

  @query("#contents-wrapper")
  private contentsWrapper!: HTMLDivElement;

  private keyDownHandler = this.handleKeyDown.bind(this);
  private loadingHandler = this.handleLoading.bind(this);
  private loadedHandler = this.handleLoaded.bind(this);

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
      this.spectrogram.removeEventListener(SpectrogramComponent.loadingEventName, this.loadingHandler);
      this.spectrogram.removeEventListener(SpectrogramComponent.loadedEventName, this.loadedHandler);
    }

    this.intersectionObserver.disconnect();

    super.disconnectedCallback();
  }

  public firstUpdated(): void {
    if (!this.spectrogram) {
      throw new Error("Could not find spectrogram component");
    }

    this.spectrogram.addEventListener(SpectrogramComponent.loadingEventName, this.loadingHandler);
    this.spectrogram.addEventListener(SpectrogramComponent.loadedEventName, this.loadedHandler);

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
    this.intersectionObserver.observe(this.slotWrapper);
    this.intersectionObserver.observe(this.contentsWrapper);
  }

  // TODO: check if the model has updated, and conditionally change the spectrograms src
  public willUpdate(): void {
    if (this.spectrogram && this.model?.url) {
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

  public resetSettings(): void {
    if (this.spectrogram) {
      this.spectrogram.resetSettings();
    }
  }

  public addDecision(decision: Decision) {
    this.model.addDecision(decision);

    // because the model is an object (not a primitive), modifying a property
    // does not cause the re-render which is needed to display the new decision
    // as a border color
    // to fix this, we call requestUpdate which will re-render the component
    // TODO: We can probably replace this with a guard directive
    this.requestUpdate();
  }

  public removeDecision(decision: Decision) {
    this.model.removeDecision(decision);
    this.requestUpdate();
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
    const ignoreTargets = ["button", "oe-info-card", "a"];
    const eventTarget = event.target;
    if (!(eventTarget instanceof HTMLElement)) {
      return;
    }

    const targetTag = eventTarget.tagName;

    if (ignoreTargets.includes(targetTag.toLocaleLowerCase())) {
      return;
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

  private classificationMeterTemplate(requiredTag: Tag): HTMLTemplateResult {
    const decision = this.model.classifications.get(requiredTag.text);
    const decisionText = decision ? decision.confirmed : "no decision";

    let color: string | undefined;
    if (decision && decision.confirmed !== DecisionOptions.SKIP) {
      color = this.injector.colorService(decision);
    }

    return this.meterSegmentTemplate(`${requiredTag.text} (${decisionText})`, color);
  }

  private verificationMeterTemplate(): HTMLTemplateResult {
    const currentVerificationModel = this.model.verification;

    let decisionText = "no decision";
    if (currentVerificationModel === decisionNotRequired) {
      decisionText = "not required";
    } else if (currentVerificationModel) {
      decisionText = currentVerificationModel.confirmed;
    }

    const tooltipText = `verification: ${this.model.tag.text} (${decisionText})`;

    // if there is no verification decision on the tiles subject model, then
    // return the verification meter segment with no color
    if (!currentVerificationModel) {
      return this.meterSegmentTemplate(tooltipText);
    }

    const meterColor = this.injector.colorService(currentVerificationModel);
    return this.meterSegmentTemplate(tooltipText, meterColor);
  }

  private newTagMeterTemplate(): HTMLTemplateResult {
    const currentNewTag = this.model.newTag;

    let tooltipText = "";
    if (currentNewTag === decisionNotRequired) {
      tooltipText = "new tag: not required";
    } else if (currentNewTag) {
      tooltipText = `new tag: ${currentNewTag.tag.text}`;
    } else {
      tooltipText = "new tag: no decision";
    }

    if (!currentNewTag) {
      return this.meterSegmentTemplate(tooltipText);
    }

    const meterColor = this.injector.colorService(currentNewTag);
    return this.meterSegmentTemplate(tooltipText, meterColor);
  }

  private meterSegmentTemplate(tooltip: string, color?: string): HTMLTemplateResult {
    return html`
      <sl-tooltip content="${tooltip}">
        <span class="progress-meter-segment" style="background: var(${ifDefined(color)})"></span>
      </sl-tooltip>
    `;
  }

  private progressMeterTemplate(): HTMLTemplateResult {
    // prettier wants to format this as a single line because it thinks it is
    // string interpolation
    // to improve readability, I have disabled prettier for this line so that we
    // can put each of the templates on a separate line
    // prettier-ignore
    return html`
      ${repeat(this.requiredDecisions, (requiredDecision: RequiredDecision) => {
        if (requiredDecision === requiredVerificationPlaceholder) {
          return this.verificationMeterTemplate();
        } else if (requiredDecision === requiredNewTagPlaceholder) {
          return this.newTagMeterTemplate();
        }

        return this.classificationMeterTemplate(requiredDecision);
      })}
    `;
  }

  public render() {
    const tagText = this.model?.tag?.text ?? this.model?.tag;

    const tileClasses = classMap({
      selected: this.selected,
      selectable: !this.isOnlyTile,
      hidden: this.hidden,
    });

    const figureClasses = classMap({
      selected: this.selected,
    });

    let tooltipContent = "";
    if (!this.model?.newTag) {
      tooltipContent = `This item was tagged as '${tagText}' in your data source`;
    } else if (this.model?.newTag === decisionNotRequired) {
      tooltipContent = `The requirements for this task have not been met`;
    } else {
      tooltipContent = `This item has been corrected to '${this.model?.newTag?.tag?.text}'`;
    }

    // use a pointerdown event instead of a click event because MacOS doesn't
    // trigger a click event if someone shift clicks on a tile
    return html`
      <div
        id="contents-wrapper"
        @pointerdown="${this.dispatchSelectedEvent}"
        @keydown="${this.handleFocusedKeyDown}"
        class="tile-container vertically-fill ${tileClasses}"
        part="tile-container"
        role="button"
        tabindex="0"
        aria-hidden="${this.hidden}"
        aria-keyshortcuts="${ALT_KEY}+${this.shortcuts.join(",")}"
      >
        ${this.keyboardShortcutTemplate()}
        <figure class="spectrogram-container vertically-fill ${figureClasses}">
          <div class="figure-head">
            <figcaption class="tag-label">
              <sl-tooltip content="${tooltipContent}" placement="bottom-start" hoist>
                <span>
                  ${this.model?.newTag && this.model?.newTag !== decisionNotRequired
                    ? html`<del>${tagText}</del> <ins>${this.model?.newTag?.tag.text}</ins>`
                    : html`${tagText}`}
                </span>
              </sl-tooltip>
            </figcaption>

            ${when(
              this.settings.showMediaControls.value,
              () => html`<oe-media-controls for="spectrogram"></oe-media-controls>`,
            )}
          </div>

          <oe-axes
            class="vertically-fill"
            ?x-title-visible="${watch(this.settings.showAxes)}"
            ?y-title-visible="${watch(this.settings.showAxes)}"
            ?x-axis="${watch(this.settings.showAxes)}"
            ?y-axis="${watch(this.settings.showAxes)}"
            ?x-grid="${watch(this.settings.showAxes)}"
            ?y-grid="${watch(this.settings.showAxes)}"
          >
            <oe-indicator class="vertically-fill">
              <oe-spectrogram id="spectrogram" class="vertically-fill" color-map="audacity"></oe-spectrogram>
            </oe-indicator>
          </oe-axes>

          <div class="progress-meter">${this.progressMeterTemplate()}</div>

          <div id="slot-wrapper">
            <slot></slot>
          </div>
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
