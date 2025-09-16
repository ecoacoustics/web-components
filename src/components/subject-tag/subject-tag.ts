import { customElement } from "lit/decorators.js";
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
export class TagTemplateComponent extends WithShoelace(AbstractComponent(LitElement)) {
  public static styles = unsafeCSS(tagTemplateStyles);

  // The subject can be undefined if this component is not slotted inside of a
  // grid tile component.
  @consume({ context: gridTileContext, subscribe: true })
  private tile?: VerificationGridTileContext;

  private get tagText(): string {
    return this.tile?.model?.tag?.text ?? "";
  }

  private tooltipContent(): string {
    if (!this.tile?.model?.newTag) {
      return `This item was tagged as '${this.tagText}' in your data source`;
    }

    if (this.tile?.model?.newTag === decisionNotRequired) {
      return `The requirements for this task have not been met`;
    }

    if (!this.tile?.model.tag) {
      // If we didn't originally have a tag to correct
      return `'${this.tile?.model?.newTag?.tag?.text}' has been added to this subject`;
    }

    // We replaced the original tag with a new tag
    return `This item has been corrected to '${this.tile?.model?.newTag?.tag?.text}'`;
  }

  public render(): HTMLTemplateResult {
    return html`
      <figcaption class="tag-label">
        <sl-tooltip content="${this.tooltipContent()}" placement="bottom-start" hoist>
          <span data-testid="tile-tag-text">
            ${this.tile?.model?.newTag && this.tile.model.newTag !== decisionNotRequired
              ? html`<del>${this.tagText}</del> <ins>${this.tile?.model?.newTag?.tag?.text}</ins>`
              : html`${this.tagText}`}
          </span>
        </sl-tooltip>
      </figcaption>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-subject-tag": TagTemplateComponent;
  }
}
