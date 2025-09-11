import { customElement, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, HTMLTemplateResult, LitElement, unsafeCSS } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { Tag } from "../../models/tag";
import { consume } from "@lit/context";
import { gridTileContext, injectionContext } from "../../helpers/constants/contextTokens";
import {
  RequiredDecision,
  requiredNewTagPlaceholder,
  requiredVerificationPlaceholder,
  VerificationGridTileContext,
} from "../verification-grid-tile/verification-grid-tile";
import { decisionNotRequired } from "../../models/decisions/decisionNotRequired";
import { VerificationGridInjector } from "../verification-grid/verification-grid";
import { DecisionOptions } from "../../models/decisions/decision";
import { ifDefined } from "lit/directives/if-defined.js";
import taskMeterStyles from "./css/style.css?inline";

@customElement("oe-task-meter")
export class TaskMeterComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(taskMeterStyles);

  // The subject can be undefined if this component is not slotted inside of a
  // grid tile component.
  @consume({ context: gridTileContext, subscribe: true })
  public tile?: VerificationGridTileContext;

  @consume({ context: injectionContext, subscribe: true })
  @state()
  private injector!: VerificationGridInjector;

  private classificationMeterTemplate(requiredTag: Tag): HTMLTemplateResult {
    const decision = this.tile?.model.classifications.get(requiredTag.text);
    const decisionText = decision ? decision.confirmed : "no decision";

    const color: string | undefined = decision ? this.injector.colorService(decision) : undefined;

    return this.meterSegmentTemplate(`${requiredTag.text} (${decisionText})`, color);
  }

  private verificationMeterTemplate(): HTMLTemplateResult {
    const currentVerificationModel = this.tile?.model.verification;

    let decisionText = "no decision";
    if (currentVerificationModel === decisionNotRequired) {
      decisionText = "not required";
    } else if (currentVerificationModel) {
      decisionText = currentVerificationModel.confirmed;
    }

    // Sometimes there is no tag. On the subject. In this case, we have to
    // change the tooltip a bit.
    const verificationTagText = (this.tile?.model.verification as any)?.tag?.text;
    const tooltipText = verificationTagText
      ? `verification: ${verificationTagText} (${decisionText})`
      : `verification: ${decisionText}`;

    // if there is no verification decision on the tiles subject model, then
    // return the verification meter segment with no color
    if (!currentVerificationModel) {
      return this.meterSegmentTemplate(tooltipText);
    }

    const meterColor = this.injector.colorService(currentVerificationModel);
    return this.meterSegmentTemplate(tooltipText, meterColor);
  }

  private newTagMeterTemplate(): HTMLTemplateResult {
    const currentNewTag = this.tile?.model.newTag;

    let tooltipText = "";
    if (currentNewTag === decisionNotRequired) {
      tooltipText = "new tag: not required";
    } else if (currentNewTag) {
      if (currentNewTag.confirmed === DecisionOptions.SKIP) {
        tooltipText = `new tag: ${currentNewTag.confirmed}`;
      } else {
        tooltipText = `new tag: ${currentNewTag.tag?.text}`;
      }
    } else {
      tooltipText = "new tag: no decision";
    }

    if (!currentNewTag) {
      return this.meterSegmentTemplate(tooltipText);
    }

    const meterColor = this.injector.colorService(currentNewTag);
    return this.meterSegmentTemplate(tooltipText, meterColor);
  }

  private meterSegmentTemplate(tooltip: string, color?: string): HTMLTemplateResult {
    return html`
      <sl-tooltip content="${tooltip}">
        <span class="progress-meter-segment" style="background: var(${ifDefined(color)})"></span>
      </sl-tooltip>
    `;
  }

  public render(): HTMLTemplateResult {
    return html`
      <div class="progress-meter">
        ${repeat(this.tile?.requiredDecisions ?? [], (requiredDecision: RequiredDecision) => {
          if (requiredDecision === requiredVerificationPlaceholder) {
            return this.verificationMeterTemplate();
          } else if (requiredDecision === requiredNewTagPlaceholder) {
            return this.newTagMeterTemplate();
          }

          return this.classificationMeterTemplate(requiredDecision);
        })}
      </div>
    `;
  }
}
