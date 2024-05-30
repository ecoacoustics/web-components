import { customElement, property, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, TemplateResult } from "lit";
import { Spectrogram } from "../../../playwright";
import { queryDeeplyAssignedElement } from "../../helpers/decorators";
import { classMap } from "lit/directives/class-map.js";
import { verificationGridTileStyles } from "./css/style";
import { Verification } from "../../models/verification";
import { theming } from "../../helpers/themes/theming";
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
 * @slot
 */
@customElement("oe-verification-grid-tile")
export class VerificationGridTile extends AbstractComponent(LitElement) {
  public static styles = [verificationGridTileStyles, theming];

  // there is a difference between @state and @property({ attribute: false })
  // see more here: https://stackoverflow.com/a/70343809
  @property({ attribute: false })
  @provide({ context: gridTileContext })
  public model!: Verification;

  @state()
  public selected = false;

  @state()
  public index = 0;

  @state()
  public showKeyboardShortcuts = false;

  @queryDeeplyAssignedElement({ selector: "oe-spectrogram" })
  private spectrogram: Spectrogram | undefined;

  private shortcuts: string[] = [];
  private shortcutHandler = this.handleKeyDown.bind(this);

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("keydown", this.shortcutHandler);
  }

  public disconnectedCallback(): void {
    document.removeEventListener("keydown", this.shortcutHandler);
    super.disconnectedCallback();
  }

  protected willUpdate(): void {
    if (this.spectrogram && this.model?.url) {
      this.spectrogram.src = this.model.url;
    }

    const shortcutKey = shortcutOrder[this.index];
    this.shortcuts = [shortcutKey, shortcutTranslation[shortcutKey] ?? ""];
  }

  private handleKeyDown(event: KeyboardEvent): void {
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
      <div @click="${this.handleClick}" class="tile-container ${classMap({ selected: this.selected })}">
        ${this.keyboardShortcutTemplate()}
        <slot></slot>
      </div>
    `;
  }
}
