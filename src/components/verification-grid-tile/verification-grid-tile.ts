import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, TemplateResult, unsafeCSS } from "lit";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { classMap } from "lit/directives/class-map.js";
import verificationGridTileStyles from "./css/style.css?inline";
import { DecisionWrapper, Tag } from "../../models/verification";
import { createContext, provide } from "@lit/context";

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

export const gridTileContext = createContext<DecisionWrapper>("grid-tile-context");

/**
 * A component to scope ids to a template inside a shadow DOM
 * This component will be used by the verification-grid component but will
 * probably not be used by users
 * It can also manage the selection state
 *
 * @property color - The border color of the tile
 *
 * @fires Loaded
 *
 * @slot
 */
@customElement("oe-verification-grid-tile")
export class VerificationGridTileComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(verificationGridTileStyles);

  @provide({ context: gridTileContext })
  @property({ attribute: false })
  public model!: DecisionWrapper;

  @property({ type: String })
  public borderColor = "var(--oe-panel-color)";

  @property({ attribute: false })
  public showKeyboardShortcuts = false;

  @property({ attribute: false })
  public selected = false;

  @property({ attribute: false })
  public index = 0;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram?: SpectrogramComponent;

  public get appliedTags(): Tag[] {
    const decisionsWithConfirmed = this.model.decisions.filter((decision) => decision.confirmed !== undefined);
    return decisionsWithConfirmed.map((decision) => decision.tag);
  }

  public get existingTags(): Tag[] {
    const verificationsWithoutDecisions = this.model.decisions.filter((decision) => decision.confirmed === undefined);
    return verificationsWithoutDecisions.map((decision) => decision.tag);
  }

  private keyDownHandler = this.handleKeyDown.bind(this);
  private keyUpHandler = this.handleKeyUp.bind(this);
  private loadingHandler = this.handleLoading.bind(this);
  private loadedHandler = this.handleLoaded.bind(this);

  public loaded = false;
  private shortcuts: string[] = [];

  // TODO: make this better
  public get showingHighlight(): boolean {
    return this.borderColor !== "var(--oe-panel-color)";
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("keydown", this.keyDownHandler);
    document.addEventListener("keyup", this.keyUpHandler);
  }

  public disconnectedCallback(): void {
    document.removeEventListener("keydown", this.keyDownHandler);
    document.removeEventListener("keyup", this.keyUpHandler);

    if (this.spectrogram) {
      this.spectrogram.removeEventListener("loading", this.loadingHandler);
      this.spectrogram.removeEventListener("loaded", this.loadedHandler);
    }

    super.disconnectedCallback();
  }

  public firstUpdated(): void {
    if (!this.spectrogram) {
      throw new Error("Could not find spectrogram component");
    }

    this.spectrogram.addEventListener("loading", this.loadingHandler);
    this.spectrogram.addEventListener("loaded", this.loadedHandler);
  }

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

  // this method is called when the spectrogram starts rendering
  private handleLoading(): void {
    this.loaded = false;
  }

  // this method is called when the spectrogram finishes rendering
  private handleLoaded(): void {
    this.loaded = true;
    this.dispatchEvent(new CustomEvent("loaded", { bubbles: true }));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // most browsers scroll a page width when the user presses the space bar
    // however, since space bar can also be used to play spectrograms, we don't
    // want to scroll when the space bar is pressed
    if (event.key === " ") {
      event.preventDefault();
    }

    if (event.altKey && this.shortcuts.includes(event.key.toLowerCase())) {
      this.dispatchEvent(
        new CustomEvent(VerificationGridTileComponent.selectedEventName, {
          bubbles: true,
          detail: {
            index: this.index,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
          },
        }),
      );
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.spectrogram) {
      throw new Error("Could not find spectrogram element");
    }

    // TODO: move this to the spectrogram component
    const spaceKey = " " as const;
    if (event.key === spaceKey && this.selected) {
      const spectrogram = this.spectrogram;

      if (spectrogram.paused) {
        spectrogram.play();
      } else {
        spectrogram.pause();
      }
    }
  }

  private handleClick(event: MouseEvent | TouchEvent) {
    // TODO: passing through client events should be handled by the oe-media-controls component
    const ignoreTargets = ["oe-media-controls", "button", "oe-info-card", "a"];
    // TODO: remove type override
    const targetTag = (event.target as HTMLElement).tagName;

    if (ignoreTargets.includes(targetTag.toLocaleLowerCase())) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent(VerificationGridTileComponent.selectedEventName, {
        bubbles: true,
        detail: {
          index: this.index,
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
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

  public render() {
    return html`
      <div
        @pointerdown="${this.handleClick}"
        class="tile-container ${classMap({ selected: this.selected })}"
        style="--decision-color: ${this.borderColor}"
        role="button"
      >
        ${this.keyboardShortcutTemplate()}
        <figure>
          <figcaption class="tag-label">${this.model?.tag}</figcaption>
          <slot></slot>
        </figure>
      </div>
    `;
  }

  public static selectedEventName = "selected" as const;
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-verification-grid-tile": VerificationGridTileComponent;
  }
}
