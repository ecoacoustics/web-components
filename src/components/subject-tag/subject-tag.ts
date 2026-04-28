import { customElement } from "../../helpers/customElement";
import { WithShoelace } from "../../mixins/withShoelace";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { consume } from "@lit/context";
import { gridTileContext } from "../../helpers/constants/contextTokens";
import { decisionNotRequired } from "../../models/decisions/decisionNotRequired";
import { VerificationGridTileContext } from "verification-grid-tile/verification-grid-tile";
import tagTemplateStyles from "./css/style.css?inline";

/**
 * @description
 * A component to display the currently applied tag to a subject.
 */
@customElement("oe-subject-tag")
export class SubjectTagComponent extends AbstractComponent(WithShoelace(LitElement)) {
  public static styles = unsafeCSS(tagTemplateStyles);

  // The subject can be undefined if this component is not slotted inside of a
  // grid tile component.
  @consume({ context: gridTileContext, subscribe: true })
  private tile?: VerificationGridTileContext;

  private get originalTag() {
    return this.tile?.model?.tag;
  }

  private get originalTagText(): string {
    return this.originalTag?.text ?? "";
  }

  private get newTag() {
    return this.tile?.model?.newTag;
  }

  private get newTagText(): string {
    if (this.newTag === decisionNotRequired) {
      return "";
    }

    return this.newTag?.tag?.text ?? "";
  }

  private tooltipContent(): string {
    if (!this.newTag) {
      return `This item was tagged as '${this.originalTagText}' in your data source`;
    }

    if (this.newTag === decisionNotRequired) {
      return `The requirements for this task have not been met`;
    }

    if (!this.originalTag) {
      // If we didn't originally have a tag to correct
      return `'${this.newTagText}' has been added to this subject`;
    }

    // We replaced the original tag with a new tag
    return `This item has been corrected to '${this.newTagText}'`;
  }

  public render(): HTMLTemplateResult {
    return html`
      <figcaption class="tag-label">
        <sl-tooltip content="${this.tooltipContent()}" placement="bottom-start" hoist>
          <span data-testid="tile-tag-text">
            ${this.newTag && this.newTag !== decisionNotRequired
              ? html`<del>${this.originalTagText}</del> <ins>${this.newTagText}</ins>`
              : html`${this.originalTagText}`}
          </span>
        </sl-tooltip>
      </figcaption>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-subject-tag": SubjectTagComponent;
  }
}
