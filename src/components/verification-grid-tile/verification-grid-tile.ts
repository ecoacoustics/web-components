import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, TemplateResult, unsafeCSS } from "lit";
import { IPlayEvent, SpectrogramComponent } from "../spectrogram/spectrogram";
import { classMap } from "lit/directives/class-map.js";
import { consume, createContext, provide } from "@lit/context";
import { booleanConverter } from "../../helpers/attributes";
import { ENTER_KEY, SPACE_KEY } from "../../helpers/keyboard";
import { decisionColors } from "../../helpers/themes/decisionColors";
import { SubjectWrapper } from "../../models/subject";
import { Decision, DecisionOptions } from "../../models/decisions/decision";
import { SignalWatcher, watch } from "@lit-labs/preact-signals";
import {
  injectionContext,
  verificationGridContext,
  VerificationGridInjector,
  VerificationGridSettings,
} from "../verification-grid/verification-grid";
import { when } from "lit/directives/when.js";
import { Tag } from "../../models/tag";
import { repeat } from "lit/directives/repeat.js";
import { hasCtrlLikeModifier } from "../../helpers/userAgent";
import { ifDefined } from "lit/directives/if-defined.js";
import verificationGridTileStyles from "./css/style.css?inline";

const shortcutOrder = "1234567890qwertyuiopasdfghjklzxcvbnm" as const;
const shortcutTranslation: Record<string, string> = {
  1: "!",
  2: "@",
  3: "#",
  4: "$",
  5: "%",
  6: "^",
  7: "&",
  8: "*",
  9: "(",
  0: ")",
} as const;

export const gridTileContext = createContext<SubjectWrapper>(Symbol("grid-tile-context"));

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
 * @cssproperty [--selected-border-size] - The size of the border when a
 * decision is being shown
 *
 * @fires Loaded
 */
@customElement("oe-verification-grid-tile")
export class VerificationGridTileComponent extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = [unsafeCSS(verificationGridTileStyles), decisionColors];

  public static readonly selectedEventName = "selected" as const;

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

  @property({ attribute: false, type: Array })
  public requiredTags!: Tag[];

  @query("oe-spectrogram")
  private spectrogram?: SpectrogramComponent;

  @query("#contents-wrapper")
  private contentsWrapper!: HTMLDivElement;

  private keyDownHandler = this.handleKeyDown.bind(this);
  private loadingHandler = this.handleLoading.bind(this);
  private loadedHandler = this.handleLoaded.bind(this);
  private playHandler = this.handlePlay.bind(this);

  public loaded = false;
  private shortcuts: string[] = [];

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("keydown", this.keyDownHandler);
  }

  public disconnectedCallback(): void {
    document.removeEventListener("keydown", this.keyDownHandler);

    if (this.spectrogram) {
      this.spectrogram.removeEventListener("loading", this.loadingHandler);
      this.spectrogram.removeEventListener("loaded", this.loadedHandler);
    }

    this.contentsWrapper.removeEventListener<any>(SpectrogramComponent.playEventName, this.playHandler);

    super.disconnectedCallback();
  }

  public firstUpdated(): void {
    this.contentsWrapper.addEventListener<any>(SpectrogramComponent.playEventName, this.playHandler);

    if (!this.spectrogram) {
      throw new Error("Could not find spectrogram component");
    }

    this.spectrogram.addEventListener("loading", this.loadingHandler);
    this.spectrogram.addEventListener("loaded", this.loadedHandler);
  }

  // TODO: check if the model has updated, and conditionally change the spectrograms src
  public willUpdate(): void {
    if (this.spectrogram && this.model?.url) {
      this.spectrogram.src = this.model.url;
    }

    const shortcutKey = shortcutOrder[this.index];
    this.shortcuts = [shortcutKey, shortcutTranslation[shortcutKey] ?? ""];
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

  private handlePlay(event: CustomEvent<IPlayEvent>): void {
    if (!this.selected && event.detail.keyboardShortcut) {
      console.log("short from tile");
      event.preventDefault();
    }
  }

  // this method is called when the spectrogram starts rendering
  private handleLoading(): void {
    this.loaded = false;
  }

  // this method is called when the spectrogram finishes rendering
  private handleLoaded(): void {
    this.loaded = true;
    this.dispatchEvent(new CustomEvent("loaded", { bubbles: true }));
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
    // most browsers scroll a page width when the user presses the space bar
    // however, since space bar can also be used to play spectrograms, we don't
    // want to scroll when the space bar is pressed
    if (event.key === SPACE_KEY) {
      event.preventDefault();
    }

    if (event.altKey && this.shortcuts.includes(event.key.toLowerCase())) {
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

  private keyboardShortcutTemplate(): TemplateResult<1> {
    return html`
      <div class="keyboard-hint ${classMap({ hidden: !this.showKeyboardShortcuts })}">
        <kbd>${this.shortcuts.at(0)}</kbd>
      </div>
    `;
  }

  private meterSegmentsTemplate(): TemplateResult<1> {
    return html`
      ${repeat(this.requiredTags, (tag: Tag) => {
        const decision = this.model.decisions.get(tag.text);
        const decisionText = decision ? decision.confirmed : "no decision";

        let color: string | undefined;
        if (decision && decision.confirmed !== DecisionOptions.SKIP) {
          color = this.injector.colorService(decision);
        }

        return html`
          <sl-tooltip content="${tag.text ?? tag} (${decisionText})">
            <span class="progress-meter-segment" style="background-color: var(${ifDefined(color)})"></span>
          </sl-tooltip>
        `;
      })}
    `;
  }

  public render() {
    const tileClasses = classMap({
      selected: this.selected,
      hidden: this.hidden,
    });

    const figureClasses = classMap({
      selected: this.selected,
    });

    // use a pointerdown event instead of a click event because MacOS doesn't
    // trigger a click event if someone shift clicks on a tile
    return html`
      <div
        id="contents-wrapper"
        @pointerdown="${this.dispatchSelectedEvent}"
        @keydown="${this.handleFocusedKeyDown}"
        class="tile-container ${tileClasses}"
        part="tile-container"
        role="button"
        tabindex="0"
        aria-hidden="${this.hidden}"
      >
        ${this.keyboardShortcutTemplate()}
        <figure class="spectrogram-container ${figureClasses}">
          <figcaption class="tag-label">${this.model?.tag?.text ?? this.model?.tag}</figcaption>

          <oe-axes
            ?x-title-visible="${watch(this.settings.showAxes)}"
            ?y-title-visible="${watch(this.settings.showAxes)}"
            ?x-axis="${watch(this.settings.showAxes)}"
            ?y-axis="${watch(this.settings.showAxes)}"
            ?x-grid="${watch(this.settings.showAxes)}"
            ?y-grid="${watch(this.settings.showAxes)}"
          >
            <oe-indicator>
              <oe-spectrogram id="spectrogram" color-map="audacity"></oe-spectrogram>
            </oe-indicator>
          </oe-axes>

          <div class="progress-meter">${this.meterSegmentsTemplate()}</div>

          ${when(
            this.settings.showMediaControls.value,
            () => html`<oe-media-controls for="spectrogram"></oe-media-controls>`,
          )}

          <slot></slot>
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
