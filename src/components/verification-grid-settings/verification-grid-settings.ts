import { customElement, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, nothing, unsafeCSS } from "lit";
import {
  VerificationGridComponent,
  verificationGridContext,
  VerificationGridSettings,
} from "../verification-grid/verification-grid";
import { queryParentElement } from "../../helpers/decorators";
import { ChangeEvent } from "../../helpers/types/advancedTypes";
import { ifDefined } from "lit/directives/if-defined.js";
import { consume } from "@lit/context";
import { SignalWatcher, watch } from "@lit-labs/preact-signals";
import settingComponentStyles from "./css/style.css?inline";

@customElement("oe-verification-grid-settings")
export class VerificationGridSettingsComponent extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = unsafeCSS(settingComponentStyles);

  @consume({ context: verificationGridContext, subscribe: true })
  @state()
  public settings!: VerificationGridSettings;

  /** An internal representation of the verification grids size */
  @state()
  private gridSize?: number;

  @queryParentElement({ selector: "oe-verification-grid" })
  private verificationGrid?: VerificationGridComponent;

  private fullscreenChangeHandler = this.updateFullscreenState.bind(this);

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("fullscreenchange", this.fullscreenChangeHandler);
  }

  public disconnectedCallback(): void {
    document.removeEventListener("fullscreenchange", this.fullscreenChangeHandler);
    super.disconnectedCallback();
  }

  private toggleFullscreen(state?: boolean) {
    const shouldBeFullscreen = state ?? !this.settings.isFullscreen.value;
    const fullscreenTarget = this.verificationGrid;

    if (shouldBeFullscreen) {
      if (!fullscreenTarget) {
        throw new Error("Could not find verification element to fullscreen");
      }

      fullscreenTarget.requestFullscreen();
    } else {
      document.exitFullscreen();
    }

    this.updateFullscreenState();
  }

  private updateFullscreenState(): void {
    this.settings.isFullscreen.value = document.fullscreenElement === this.verificationGrid;
  }

  private updateGridSizeState(): void {
    if (!this.verificationGrid) {
      throw new Error("Could not find associated verification grid component");
    }

    this.gridSize = this.verificationGrid.targetGridSize;
  }

  private handleGridSizeChange(event: ChangeEvent<HTMLInputElement>) {
    if (!this.verificationGrid) {
      throw new Error("Could not find associated verification grid component");
    }

    // Number is more strict in parsing values than parseInt
    const inputValue = event.target.value;
    const newGridSize = Number(inputValue);

    this.verificationGrid.targetGridSize = newGridSize;

    this.updateGridSizeState();
  }

  private gridSizeSettingsTemplate() {
    if (!this.verificationGrid) {
      throw new Error("Could not find associated verification grid component");
    }

    const canResizeGrid = this.settings.maximumTargetGridSize.value > 1;
    if (!canResizeGrid) {
      return nothing;
    }

    return html`
      <sl-dropdown placement="top-start">
        <sl-tooltip slot="trigger" content="Change the verification grids target size">
          <button
            id="grid-size-trigger"
            @click="${this.updateGridSizeState}"
            class="oe-btn-secondary"
            ?disabled="${!this.verificationGrid}"
            aria-label="Change the verification grid size"
          >
            <sl-icon name="grid" class="large-icon"></sl-icon>
          </button>
        </sl-tooltip>

        <sl-menu>
          <label id="grid-size-label">
            ${this.gridSize}
            <input
              id="grid-size-input"
              @change="${this.handleGridSizeChange}"
              type="range"
              value="${ifDefined(this.gridSize)}"
              min="1"
              max="${watch(this.settings.maximumTargetGridSize)}"
            />
          </label>
        </sl-menu>
      </sl-dropdown>
    `;
  }

  private fullscreenSettingsTemplate() {
    // document.fullscreenEnabled is a browser API that checks if the current
    // webpage is allowed to enter fullscreen mode
    const canEnterFullscreen = document.fullscreenEnabled;
    const buttonLabel = `${this.settings.isFullscreen.value ? "Exit" : "Enter"} fullscreen mode`;

    return html`
      <sl-tooltip content="${buttonLabel}">
        <button
          id="fullscreen-button"
          class="oe-btn-secondary"
          @click="${() => this.toggleFullscreen()}"
          ?disabled="${!canEnterFullscreen}"
          aria-label="${buttonLabel}"
        >
          <sl-icon
            name="${this.settings.isFullscreen.value ? "fullscreen-exit" : "arrows-fullscreen"}"
            class="large-icon"
          ></sl-icon>
        </button>
      </sl-tooltip>
    `;
  }

  public render() {
    // prettier sees the html template as string interpolation and tries to
    // format it by placing the grid size and fullscreen setting templates on
    // the same line, which reduces readability.
    // I've disabled prettier for this html template so that I can place the
    // two settings templates on separate lines for better readability.
    // prettier-ignore
    return html`
      <div class="settings-container">
        ${this.gridSizeSettingsTemplate()}
        ${this.fullscreenSettingsTemplate()}
      </div>
    `;
  }
}
