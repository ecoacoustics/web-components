import { customElement, property, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, nothing, TemplateResult, unsafeCSS } from "lit";
import infoCardStyle from "./css/style.css?inline";
import { consume } from "@lit/context";
import { gridTileContext } from "../verification-grid-tile/verification-grid-tile";
import { Subject, SubjectWrapper } from "../../models/subject";

type InfoCardTemplate = (value: any) => any;

/**
 * @description
 * Displays information about a verification tile subject
 */
@customElement("oe-info-card")
export class InfoCardComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(infoCardStyle);

  @consume({ context: gridTileContext, subscribe: true })
  @property({ attribute: false })
  public model?: SubjectWrapper;

  /** Number of subject key/values pairs to show before the "Show More" button is clicked */
  @property({ attribute: "default-lines", type: Number, reflect: true })
  public defaultLines = 3;

  @state()
  private showExpanded = false;

  private identityStrategy: InfoCardTemplate = (value: unknown): typeof value => value;
  private numberStrategy: InfoCardTemplate = (value: number | string): string => Number(value).toLocaleString();
  private urlStrategy = (value: string): TemplateResult<1> =>
    html`<a href="${value}" target="_blank">${this.formatUrl(value)}</a>`;

  private subjectRowCount(): number {
    if (!this.model) {
      return 0;
    }

    return Object.keys(this.model.subject).length;
  }

  /**
   * Converts a url into a human readable format
   * by using the format https://.../last-path?first-parameter...
   */
  private formatUrl(url: string): string {
    const ellipsis = "…";

    const protocol = url.split(":/")[0];
    const pathFragment = url.split("/").at(-1)?.split("&")[0] ?? "";
    const hasAdditionalParameters = url.split("&").length > 1;
    const additionalParametersFragment = hasAdditionalParameters ? ellipsis : "";
    return protocol + ellipsis + pathFragment + additionalParametersFragment;
  }

  private subjectRowTemplate(subject: [key: string, value: unknown]) {
    const [key, value] = subject;

    let valueStrategy: InfoCardTemplate = this.identityStrategy;

    if (typeof value === "string" && value.includes(":/")) {
      valueStrategy = this.urlStrategy;
    } else if (typeof value === "number" || (!isNaN(Number(value)) && value !== "")) {
      // we have to make a special case for an empty string becaue when an
      // empty string is put through the Number() constructor, it will in
      // a result of zero, when we should really be dispalying an empty string
      valueStrategy = this.numberStrategy;
    }

    return html`
      <div class="subject-row">
        <div class="subject-key">${key}</div>
        <div class="subject-value">${valueStrategy(value)}</div>
      </div>
    `;
  }

  private subjectTemplate(subject?: Subject) {
    if (subject === undefined) {
      return nothing;
    }

    const subjectEntries = Object.entries(subject);
    if (!this.showExpanded) {
      subjectEntries.splice(this.defaultLines);
    }

    return subjectEntries.map((value) => this.subjectRowTemplate(value));
  }

  private showMoreButtonTemplate() {
    const shouldBeVisible = this.subjectRowCount() > this.defaultLines;

    if (!shouldBeVisible) {
      return nothing;
    }

    return html`
      <a id="show-more" href="javascript:void 0" @click="${() => (this.showExpanded = !this.showExpanded)}">
        ${this.showExpanded ? "Show Less" : "Show More"}
      </a>
    `;
  }

  public render() {
    return html`
      <div class="card-container">
        <div class="subject-content">${this.subjectTemplate(this.model?.subject)}</div>

        <hr />

        <div class="static-actions">
          <a id="download-recording" href="${this.model?.url ?? ""}" target="_blank" download>Download Recording</a>
          ${this.showMoreButtonTemplate()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-info-card": InfoCardComponent;
  }
}
