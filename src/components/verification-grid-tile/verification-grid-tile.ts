import { customElement, property, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, TemplateResult } from "lit";
import { Spectrogram } from "../spectrogram/spectrogram";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { classMap } from "lit/directives/class-map.js";
import { verificationGridTileStyles } from "./css/style";
import { Verification } from "../../models/verification";
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

export const gridTileContext = createContext<Verification>("grid-tile-context");

/**
 * A component to scope ids to a template inside a shadow DOM
 * This component will be used by the verification-grid component but will
 * probably not be used by users
 * It can also manage the selection state
 *
 * @property src - The source of the spectrogram
 * @property selected - If the item is selected as part of a sub-selection
 * @property order - Used for shift selection
 * 
 * @fires Loaded
 *
 * @slot
 */
@customElement("oe-verification-grid-tile")
export class VerificationGridTile extends AbstractComponent(LitElement) {
  public static styles = verificationGridTileStyles;

  // there is a difference between @state and @property({ attribute: false })
  // see more here: https://stackoverflow.com/a/70343809
  @provide({ context: gridTileContext })
  @property({ attribute: false })
  public model!: Verification;

  @property({ type: String })
  public color = "var(--oe-panel-color)";

  @state()
  public selected = false;

  @state()
  public index = 0;

  @state()
  public showKeyboardShortcuts = false;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  public spectrogram: Spectrogram | undefined;

  public loaded = false;
  private shortcuts: string[] = [];
  private keyDownHandler = this.handleKeyDown.bind(this);
  private keyUpHandler = this.handleKeyUp.bind(this);
  private loadingHandler = this.handleLoading.bind(this);
  private loadedHandler = this.handleLoaded.bind(this);

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
    // most browsers scroll a page width when the user presses the spacebar
    // however, since spacebar can also be used to play spectrograms, we don't
    // want to scroll when the spacebar is pressed
    if (event.key === " ") {
      event.preventDefault();
    }

    if (event.altKey && this.shortcuts.includes(event.key.toLowerCase())) {
      this.dispatchEvent(
        new CustomEvent("selected", {
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
      new CustomEvent("selected", {
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
        @click="${this.handleClick}"
        class="tile-container ${classMap({ selected: this.selected })}"
        style="--decision-color: ${this.color}"
      >
        ${this.keyboardShortcutTemplate()}
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-verification-grid-tile": VerificationGridTile;
  }
}
