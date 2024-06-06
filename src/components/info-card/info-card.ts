import { customElement, property, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, nothing, TemplateResult } from "lit";
import { infoCardStyle } from "./css/style";
import { consume } from "@lit/context";
import { gridTileContext } from "../verification-grid-tile/verification-grid-tile";
import { Verification, VerificationSubject } from "../../models/verification";
import { classMap } from "lit/directives/class-map.js";

@customElement("oe-info-card")
export class InfoCard extends AbstractComponent(LitElement) {
  public static styles = infoCardStyle;

  @consume({ context: gridTileContext, subscribe: true })
  @property({ attribute: false })
  public model!: Verification;

  @state()
  private showExpanded = false;

  private dateTemplate = (value: string) => new Date(value).toISOString();
  private numberTemplate = (value: number | string) => Number(value).toLocaleString();
  private identityTemplate = (value: unknown) => value;

  // because urls can be unreasonably long, we want to truncate them
  // we do this by using the format https://.../last-path?first-parameter...
  private urlTemplate(url: string): TemplateResult<1> {
    const protocol = url.split(":/")[0];
    const pathFragment = url.split("/").at(-1)?.split("&")[0] ?? "";
    const hasAdditionalParameters = url.split("&").length > 1;
    const formattedValue = `${protocol}…${pathFragment}${hasAdditionalParameters ? "…" : ""}`;

    return html`<a href="${url}" target="_blank">${formattedValue}</a>`;
  }

  private subjectRowTemplate(subject: [key: string, value: unknown]) {
    const [key, value] = subject;

    let valueTemplate: any = this.identityTemplate;

    if (typeof value === "string" && value.includes(":/")) {
      valueTemplate = this.urlTemplate;
    }

    if (typeof value === "number" || !isNaN(Number(value))) {
      valueTemplate = this.numberTemplate;
    }

    if (value instanceof Date) {
      valueTemplate = this.dateTemplate;
    }

    // default template if we don't know the data type
    return html`
      <div class="subject-row">
        <div class="subject-key">${key}</div>
        <div class="subject-value">${valueTemplate(value)}</div>
      </div>
    `;
  }

  private subjectTemplate(subject: VerificationSubject | undefined) {
    if (subject === undefined) {
      return nothing;
    }

    const subjectEntries = Object.entries(subject);

    if (!this.showExpanded) {
      subjectEntries.splice(3);
    }

    return html`${subjectEntries.map((value) => this.subjectRowTemplate(value))}`;
  }

  public render() {
    const subject: VerificationSubject | undefined = this.model?.subject;

    console.log("new model");

    return html`
      <div class="card-container ${classMap({ expanded: this.showExpanded })}">
        ${this.subjectTemplate(subject)}

        <hr />

        <div class="static-actions">
          <a href="${this.model?.url}" target="_blank" download>Download Recording</a>
          <a target="_blank" @click="${() => (this.showExpanded = !this.showExpanded)}">
            ${this.showExpanded ? "Show Less" : "Show More"}
          </a>
        </div>
      </div>
    `;
  }
}
