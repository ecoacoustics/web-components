import { LitElement, PropertyValues, html, nothing, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ILogger, rootContext } from "../logger/logger";
import { provide } from "@lit/context";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { AxesComponent, AxesOptions } from "../axes/axes";
import { SPACE_KEY } from "../../helpers/keyboard";
import { settingsTemplateFactory } from "../../templates/settings";
import { signal } from "@lit-labs/preact-signals";
import { SpectrogramOptions } from "../../helpers/audio/models";
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

      // because we want to scope the for attribute to the current shadow root
      // we need to use the getRootNode method to get the shadow root
      const rootNode = this.getRootNode() as HTMLElement;
      this.spectrogramElement = rootNode.querySelector<SpectrogramComponent>(`#${this.for}`);
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
    const ignoreTargets = ["input"];
    const eventTarget = event.target;
    if (!(eventTarget instanceof HTMLElement)) {
      return;
    }

    const targetTag = eventTarget.tagName.toLowerCase();
    if (ignoreTargets.includes(targetTag)) {
      return;
    }

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

  private settingsTemplate() {
    if (!this.spectrogramElement || !this.axesElement) {
      return nothing;
    }

    const spectrogramOptionsSignal = signal<SpectrogramOptions>(this.spectrogramElement.spectrogramOptions);
    spectrogramOptionsSignal.subscribe((newOptions) => {
      if (!this.spectrogramElement) {
        throw new Error(
          "No spectrogram element found. This might be because you forgot to unsubscribe from the options signal",
        );
      }
      this.spectrogramElement.spectrogramOptions = newOptions;
    });

    const axesOptionsSignal = signal<AxesOptions>(this.axesElement.axesOptions);
    axesOptionsSignal.subscribe((newOptions) => {
      if (!this.axesElement) {
        throw new Error(
          "No axes element found. This might be because you forgot to unsubscribe from the options signal",
        );
      }
      this.axesElement.axesOptions = newOptions;
    });

    const settingsTemplate = settingsTemplateFactory(spectrogramOptionsSignal, axesOptionsSignal);

    return html`
      <sl-dropdown hoist>
        <a class="settings-menu-item" slot="trigger">
          <sl-icon name="gear"></sl-icon>
        </a>

        ${settingsTemplate}
      </sl-dropdown>
    `;
  }

  public render() {
    return html`
      <div class="container" @pointerdown="${this.handlePointerDown}">
        <a id="action-button" @click="${() => this.toggleAudio(false)}">
          ${this.isSpectrogramPlaying() ? this.pauseIcon() : this.playIcon()}
        </a>

        ${this.settingsTemplate()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-media-controls": MediaControlsComponent;
  }
}
