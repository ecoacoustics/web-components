import { customElement } from "lit/decorators.js";
import { WithShoelace } from "../../mixins/withShoelace";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { consume } from "@lit/context";
import { gridTileContext } from "../../helpers/constants/contextTokens";
import { decisionNotRequired } from "../../models/decisions/decisionNotRequired";
import { VerificationGridTileContext } from "verification-grid-tile/verification-grid-tile";
import tagTemplateStyles from "./css/style.css?inline";

@customElement("oe-tag-template")
export class TagTemplateComponent extends WithShoelace(AbstractComponent(LitElement)) {
  public static styles = unsafeCSS(tagTemplateStyles);

  // The subject can be undefined if this component is not slotted inside of a
  // grid tile component.
  @consume({ context: gridTileContext, subscribe: true })
  public tile?: VerificationGridTileContext;

  public render(): HTMLTemplateResult {
    const tagText = this.tile?.model?.tag?.text;

    let tooltipContent = "";
    if (!this.tile?.model?.newTag) {
      tooltipContent = `This item was tagged as '${tagText}' in your data source`;
    } else if (this.tile?.model?.newTag === decisionNotRequired) {
      tooltipContent = `The requirements for this task have not been met`;
    } else if (!this.tile?.model.tag) {
      // If we didn't originally have a tag to correct
      tooltipContent = `'${this.tile?.model?.newTag?.tag?.text}' has been added to this subject`;
    } else {
      // We replaced the original tag with a new tag
      tooltipContent = `This item has been corrected to '${this.tile?.model?.newTag?.tag?.text}'`;
    }

    return html`
      <figcaption class="tag-label">
        <sl-tooltip content="${tooltipContent}" placement="bottom-start" hoist>
          <span data-testid="tile-tag-text">
            ${this.tile?.model?.newTag && this.tile.model.newTag !== decisionNotRequired
              ? html`<del>${tagText}</del> <ins>${this.tile?.model?.newTag?.tag?.text}</ins>`
              : html`${tagText}`}
          </span>
        </sl-tooltip>
      </figcaption>
    `;
  }
}
