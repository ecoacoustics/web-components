import { customElement, property, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, nothing, TemplateResult, unsafeCSS } from "lit";
import infoCardStyle from "./css/style.css?inline";
import { consume } from "@lit/context";
import { gridTileContext } from "../verification-grid-tile/verification-grid-tile";
import { DecisionWrapper, VerificationSubject } from "../../models/verification";

type InfoCardTemplate = (value: any) => any;

@customElement("oe-info-card")
export class InfoCardComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(infoCardStyle);

  @property({ type: Number, reflect: true })
  public shortLength = 3;

  @consume({ context: gridTileContext, subscribe: true })
  @property({ attribute: false })
  public model?: DecisionWrapper;

  @state()
  private showExpanded = false;

  private numberTemplate: InfoCardTemplate = (value: number | string) => Number(value).toLocaleString();
  private identityTemplate: InfoCardTemplate = (value: unknown) => value;

  // because urls can be unreasonably long, we want to truncate them
  // we do this by using the format https://.../last-path?first-parameter...
  private urlTemplate(url: string): TemplateResult<1> {
    const ellipsis = "…";

    const protocol = url.split(":/")[0];
    const pathFragment = url.split("/").at(-1)?.split("&")[0] ?? "";
    const hasAdditionalParameters = url.split("&").length > 1;
    const additionalParametersFragment = hasAdditionalParameters ? ellipsis : "";
    const formattedValue = protocol + ellipsis + pathFragment + additionalParametersFragment;

    return html`<a href="${url}" target="_blank">${formattedValue}</a>`;
  }

  private subjectRowCount(): number {
    if (!this.model) {
      return 0;
    }

    return Object.keys(this.model.subject).length;
  }

  private subjectRowTemplate(subject: [key: string, value: unknown]) {
    const [key, value] = subject;

    let valueTemplate: InfoCardTemplate = this.identityTemplate;

    if (typeof value === "string" && value.includes(":/")) {
      valueTemplate = this.urlTemplate;
    } else if (typeof value === "number" || (!isNaN(Number(value)) && value !== "")) {
      // we have to make a special case for an empty string becaue when an
      // empty string is put through the Number() constructor, it will in
      // a result of zero, when we should really be dispalying an empty string
      valueTemplate = this.numberTemplate;
    }

    return html`
      <div class="subject-row">
        <div class="subject-key">${key}</div>
        <div class="subject-value">${valueTemplate(value)}</div>
      </div>
    `;
  }

  private subjectTemplate(subject?: VerificationSubject) {
    if (subject === undefined) {
      return nothing;
    }

    const subjectEntries = Object.entries(subject);
    if (!this.showExpanded) {
      subjectEntries.splice(this.shortLength);
    }

    return subjectEntries.map((value) => this.subjectRowTemplate(value));
  }

  private showMoreButtonTemplate() {
    const shouldBeVisible = this.subjectRowCount() > this.shortLength;

    if (!shouldBeVisible) {
      return nothing;
    }

    return html`
      <a id="show-more" @pointerdown="${() => (this.showExpanded = !this.showExpanded)}">
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
