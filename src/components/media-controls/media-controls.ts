import { LitElement, PropertyValues, TemplateResult, html, nothing, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ILogger, rootContext } from "../logger/logger";
import { provide } from "@lit/context";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { SlMenuItem } from "@shoelace-style/shoelace";
import { SpectrogramOptions } from "../../helpers/audio/models";
import { AxesComponent } from "../axes/axes";
import { windowFunctions } from "../../helpers/audio/window";
import { colorScales } from "../../helpers/audio/colors";
import { SPACE_KEY } from "../../helpers/keyboard";
import mediaControlsStyles from "./css/style.css?inline";

/**
 * Specifies where you should be able to find a preference setting in the media
 * controls that can change the spectrogram settings.
 *
 * @example
 * To move the spectrogram color preferences to the overflow menu:
 * ```html
 * <oe-media-controls color-preference="overflow"></oe-media-controls>
 * ```
 *
 * @value default - Uses sane defaults for the preference positions
 * @value toolbar - The preference can be changed directly from the toolbar
 *                  Warning: If the preference is not shown in the toolbar by
 *                  default it is because the icon is not very intuitive.
 *                  If you want to change, the icon use the template slots
 * @value overflow - The preference can be changed through the overflow (cog icon) menu
 * @value hidden - The preference cannot be changed through the media controls
 */
type PreferenceLocation = "default" | "toolbar" | "overflow" | "hidden";

/**
 * A simple media player with play/pause and seek functionality that can be used with the open ecoacoustics spectrograms and components.
 *
 * @csspart play-icon - Styling applied to the play icon (including default)
 * @csspart pause-icon - Styling applied to the pause icon (including default)
 *
 * @slot play-icon - The icon to display when the media is stopped
 * @slot pause-icon - The icon to display when the media is playing
 */
@customElement("oe-media-controls")
export class MediaControlsComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(mediaControlsStyles);

  private static recursiveAxesSearch = (element: HTMLElement): AxesComponent | null => {
    if (element instanceof AxesComponent) {
      return element;
    } else if (element.parentElement) {
      return MediaControlsComponent.recursiveAxesSearch(element.parentElement);
    }

    return null;
  };

  /** A DOM selector to target the spectrogram element */
  @property({ type: String })
  public for = "";

  @property({ type: String })
  public playIconPosition: PreferenceLocation = "default";

  @provide({ context: rootContext })
  private logger: ILogger = {
    log: console.log,
  };

  // the media controls component has access to the axes element because it is
  // possible to enable/disable certain axes features from within the media controls
  private axesElement?: AxesComponent | null;
  private spectrogramElement?: SpectrogramComponent | null;
  private playHandler = this.handleUpdatePlaying.bind(this);
  private keyDownHandler = this.handleKeyDown.bind(this);

  public disconnectedCallback(): void {
    this.spectrogramElement?.removeEventListener(SpectrogramComponent.playEventName, this.playHandler);
    document.removeEventListener("keydown", this.keyDownHandler);
    super.disconnectedCallback();
  }

  public toggleAudio(keyboardShortcut = false): void {
    // if the media controls element is not bound to a spectrogram element, do nothing
    if (!this.spectrogramElement) {
      throw new Error("No spectrogram element found");
    }

    if (this.isSpectrogramPlaying()) {
      this.spectrogramElement.pause(keyboardShortcut);
    } else {
      this.spectrogramElement.play(keyboardShortcut);
    }
  }

  public isSpectrogramPlaying(): boolean {
    if (!this.spectrogramElement) {
      return false;
    }

    return !this.spectrogramElement?.paused;
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("for")) {
      // unbind the previous spectrogram element from the playing
      this.spectrogramElement?.removeEventListener(SpectrogramComponent.playEventName, this.playHandler);

      if (!this.for) {
        this.spectrogramElement = null;
        return;
      }

      // use add a keydown event listener so that we can bind space bar to play
      document.addEventListener("keydown", this.keyDownHandler);

      // TODO: this doesn't seem like the best way to select a spectrogram element
      this.spectrogramElement = this.parentElement?.querySelector<SpectrogramComponent>(`#${this.for}`);
      this.spectrogramElement?.addEventListener(SpectrogramComponent.playEventName, this.playHandler);

      if (!this.spectrogramElement) {
        return;
      }

      this.axesElement = MediaControlsComponent.recursiveAxesSearch(this.spectrogramElement);
    }
  }

  // the handlePointerDown method is attached to the top-most container of this
  // component. Meaning that all pointer events that occur within the media
  // controls component can be handled by this component, but will not propagate
  // outside to parent elements.
  // we do this because if the user clicks on a media control e.g. the play
  // button, we do not want other parent elements such as the verification grid
  // tile to receive the pointer event and think that we clicked on that element
  // and want to perform selection.
  // if you want to explicitly listen for a pointer event on this media controls
  // you can assign an event listener to the root element.
  // e.g. <oe-media-controls @pointerdown="${this.handlePointerDown}">
  private handlePointerDown(event: PointerEvent) {
    event.stopPropagation();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === SPACE_KEY) {
      this.toggleAudio(true);
    }
  }

  private handleUpdatePlaying(): void {
    this.logger.log(`Audio ${this.isSpectrogramPlaying() ? "playing" : "paused"} `);
    this.requestUpdate();
  }

  private playIcon() {
    return html`
      <slot name="play-icon" part="play-icon">
        <sl-icon name="play" class="large-icon"></sl-icon>
      </slot>
    `;
  }

  private pauseIcon() {
    return html`
      <slot name="pause-icon" part="pause-icon">
        <sl-icon name="pause" class="large-icon"></sl-icon>
      </slot>
    `;
  }

  private selectSettingsTemplate(
    text: any,
    values: string[] | number[] | ReadonlyArray<number | string>,
    currentValue: string | number | boolean,
    changeHandler: (event: CustomEvent<{ item: SlMenuItem }>) => void,
  ): TemplateResult<1> {
    return html`
      <sl-menu-item>
        ${text}
        <sl-menu @sl-select="${changeHandler}" slot="submenu">
          ${values.map(
            (value) =>
              html`<sl-menu-item
                type="${value == currentValue ? "checkbox" : "normal"}"
                value="${value}"
                ?checked=${value == currentValue}
              >
                ${value}
              </sl-menu-item>`,
          )}
        </sl-menu>
      </sl-menu-item>
    `;
  }

  private additionalSettingsTemplate() {
    if (!this.spectrogramElement) {
      return nothing;
    }

    const possibleWindowSizes = this.spectrogramElement.possibleWindowSizes;
    const possibleWindowOverlaps = this.spectrogramElement.possibleWindowOverlaps;
    const currentOptions = this.spectrogramElement.spectrogramOptions;

    const changeHandler = (key: keyof SpectrogramOptions) => {
      return (event: CustomEvent<{ item: SlMenuItem }>) => {
        if (!this.spectrogramElement) {
          throw new Error("No spectrogram element found");
        }

        // TODO: remove this after demo
        let newValue: string | number | boolean = ["windowSize", "windowOverlap"].includes(key)
          ? Number(event.detail.item.value)
          : event.detail.item.value;

        if (key === "melScale") {
          newValue = newValue === "mel";
        }

        const oldOptions = this.spectrogramElement.spectrogramOptions;
        if (key === "windowSize" && this.spectrogramElement) {
          if (this.spectrogramElement.spectrogramOptions.windowOverlap >= (newValue as number)) {
            oldOptions.windowOverlap = (newValue as number) / 2;
          }
        }

        this.spectrogramElement.spectrogramOptions = {
          ...oldOptions,
          [key]: newValue,
        } as any;

        this.requestUpdate();
      };
    };

    const axesChangeHandler = (event: CustomEvent<{ item: SlMenuItem }>) => {
      if (!this.axesElement) {
        throw new Error("No axes element found");
      }

      const menuItem = event.detail.item;
      const checkboxElement = menuItem.querySelector<HTMLInputElement>("input[type=checkbox]");

      if (!checkboxElement) {
        throw new Error("No checkbox element found");
      }

      const key = checkboxElement.name as keyof AxesComponent;
      const value = checkboxElement.checked;

      (this.axesElement as any)[key] = value;
    };

    return html`
      <sl-dropdown title="Additional Settings" hoist>
        <a slot="trigger">
          <sl-icon name="gear"></sl-icon>
        </a>
        <sl-menu>
          ${this.selectSettingsTemplate(
            "Window Function",
            Array.from(windowFunctions.keys()),
            currentOptions.windowFunction,
            changeHandler("windowFunction"),
          )}
          ${this.selectSettingsTemplate(
            "Window Size",
            possibleWindowSizes,
            currentOptions.windowSize,
            changeHandler("windowSize"),
          )}
          ${this.selectSettingsTemplate(
            "Window Overlap",
            [0, ...possibleWindowOverlaps],
            currentOptions.windowOverlap,
            changeHandler("windowOverlap"),
          )}
          ${this.selectSettingsTemplate(
            "Scale",
            ["linear", "mel"],
            currentOptions.melScale ? "mel" : "linear",
            changeHandler("melScale"),
          )}
          <sl-menu-item>
            Axes
            <sl-menu @sl-select="${axesChangeHandler}" slot="submenu">
              <sl-menu-item>
                <label>
                  <input type="checkbox" name="showXTitle" ?checked=${this.axesElement?.showXTitle} />
                  X-Axis Title
                </label>
              </sl-menu-item>

              <sl-menu-item>
                <label>
                  <input type="checkbox" name="showYTitle" ?checked=${this.axesElement?.showYTitle} />
                  Y-Axis Title
                </label>
              </sl-menu-item>

              <sl-menu-item>
                <label>
                  <input type="checkbox" name="showXAxis" ?checked=${this.axesElement?.showXAxis} />
                  X-Axis Labels
                </label>
              </sl-menu-item>

              <sl-menu-item>
                <label>
                  <input type="checkbox" name="showYAxis" ?checked=${this.axesElement?.showYAxis} />
                  Y-Axis Labels
                </label>
              </sl-menu-item>

              <sl-menu-item>
                <label>
                  <input type="checkbox" name="showXGrid" ?checked=${this.axesElement?.showXGrid} />
                  X-Axis Grid Lines
                </label>
              </sl-menu-item>

              <sl-menu-item>
                <label>
                  <input type="checkbox" name="showYGrid" ?checked=${this.axesElement?.showYGrid} />
                  Y-Axis Grid Lines
                </label>
              </sl-menu-item>
            </sl-menu>
          </sl-menu-item>
        </sl-menu>
      </sl-dropdown>
    `;
  }

  private spectrogramSettingsTemplate(): TemplateResult<1> {
    const changeColorHandler = (event: CustomEvent<{ item: SlMenuItem }>) => {
      if (!this.spectrogramElement) {
        throw new Error("No spectrogram element found");
      }

      const newValue = event.detail.item.value;

      const oldOptions = this.spectrogramElement.spectrogramOptions;
      this.spectrogramElement.spectrogramOptions = {
        ...oldOptions,
        colorMap: newValue,
      } as any;

      this.requestUpdate();
    };

    const changeNumberHandler = (event: Event) => {
      if (!this.spectrogramElement) {
        throw new Error("No spectrogram element found");
      }

      const newValue = (event.target as HTMLInputElement).value;
      const key = (event.target as HTMLInputElement).name as keyof SpectrogramOptions;
      const oldOptions = this.spectrogramElement.spectrogramOptions;

      this.spectrogramElement.spectrogramOptions = {
        ...oldOptions,
        [key]: Number(newValue),
      } as any;
    };

    const colorValues = Object.keys(colorScales);
    const currentColor = this.spectrogramElement?.spectrogramOptions.colorMap ?? "grayscale";

    return html`
      <sl-dropdown title="Colour" hoist>
        <a slot="trigger">
          <sl-icon name="palette"></sl-icon>
        </a>
        <sl-menu @sl-select="${changeColorHandler}">
          ${colorValues.map(
            (value) =>
              html`<sl-menu-item
                value="${value}"
                type="${value == currentColor ? "checkbox" : "normal"}"
                ?checked="${value == currentColor}"
              >
                ${value}
              </sl-menu-item>`,
          )}
        </sl-menu>
      </sl-dropdown>

      <sl-dropdown title="Brightness" hoist>
        <a slot="trigger">
          <sl-icon name="brightness-high"></sl-icon>
        </a>

        <sl-menu>
          <label>
            <input
              @change="${changeNumberHandler}"
              name="brightness"
              type="range"
              min="-0.5"
              max="0.5"
              step="0.01"
              value="0"
            />
          </label>
        </sl-menu>
      </sl-dropdown>

      <sl-dropdown title="Contrast" hoist>
        <a slot="trigger">
          <sl-icon name="circle-half"></sl-icon>
        </a>

        <sl-menu>
          <label>
            <input
              @change="${changeNumberHandler}"
              name="contrast"
              type="range"
              min="0"
              max="2"
              step="0.01"
              value="1"
            />
          </label>
        </sl-menu>
      </sl-dropdown>

      ${this.additionalSettingsTemplate()}
    `;
  }

  public render() {
    return html`
      <div class="container" @pointerdown="${this.handlePointerDown}">
        <a id="action-button" @click="${() => this.toggleAudio(false)}">
          ${this.isSpectrogramPlaying() ? this.pauseIcon() : this.playIcon()}
        </a>

        ${this.spectrogramSettingsTemplate()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-media-controls": MediaControlsComponent;
  }
}
