import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, unsafeCSS } from "lit";
import { VerificationGridComponent } from "verification-grid/verification-grid";
import { queryParentElement } from "../../helpers/decorators";
import settingComponentStyles from "./css/style.css?inline";

@customElement("oe-verification-grid-settings")
export class VerificationGridSettingsComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(settingComponentStyles);

  @property({ attribute: false, type: Boolean })
  public isFullscreen = false;

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
    const shouldBeFullscreen = state ?? !this.isFullscreen;
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
    this.isFullscreen = document.fullscreenElement === this.verificationGrid;
  }

  public render() {
    // document.fullscreenEnabled is a browser API that checks if the current
    // webpage is allowed to enter fullscreen mode
    const canEnterFullscreen = document.fullscreenEnabled;
    const buttonLabel = `${this.isFullscreen ? "Exit" : "Enter"} fullscreen mode`;

    return html`
      <sl-tooltip content="${buttonLabel}">
        <button
          id="fullscreen-button"
          class="oe-btn-secondary"
          @click="${() => this.toggleFullscreen()}"
          ?disabled="${!canEnterFullscreen}"
          aria-label="${buttonLabel}"
        >
          <sl-icon name="${this.isFullscreen ? "fullscreen-exit" : "arrows-fullscreen"}" class="large-icon"></sl-icon>
        </button>
      </sl-tooltip>
    `;
  }
}
