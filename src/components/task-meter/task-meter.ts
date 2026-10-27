import { customElement } from "../../helpers/customElement";
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
import { OptionalDecision } from "../../models/decisions/decisionNotRequired";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { booleanConverter, enumConverter } from "../../helpers/attributes";
import { EnumValue } from "../../helpers/types/advancedTypes";
import taskMeterStyles from "./css/style.css?inline";

/** The positions that task meter segment tooltips can be placed in. */
export enum TaskMeterTooltipPlacement {
  TOP = "top",
  BOTTOM = "bottom",
  LEFT = "left",
  RIGHT = "right",
}

/** The type of task that a task meter segment represents. */
export type TaskMeterSegmentKind = "verification" | "classification" | "new-tag";

/** The decision state that a task meter segment is displaying. */
export type TaskMeterSegmentState = EnumValue<DecisionOptions> | "not-required" | "undecided";

interface TaskMeterSegment {
  kind: TaskMeterSegmentKind;
  state: TaskMeterSegmentState;
  label: string;
  color?: string;
  tagText?: string;
}

/**
 * @description
 * A component to display what decisions have been applied to a subject and if
 * there are any outstanding decisions.
 *
 * The host has a default height and minimum width, both of which can be
 * overridden with regular CSS or inherited custom properties. Segments shrink
 * to fit the host; gaps collapse below the preferred segment width, and
 * internal separators disappear below approximately 0.75em per segment.
 * Outlines are drawn inside the meter.
 *
 * Segments expose data-kind, data-decision, and (when present) data-tag.
 * CSS-generated text or emoji can use these attributes and combine part names
 * to target a specific task and state. No segment text is visible by default;
 * the accessible summary describes all decisions independently of these styles.
 *
 * @example
 * ```html
 * <oe-task-meter
 *   tooltip-placement="bottom"
 *   style="height: 1rem; --oe-task-meter-gap: 2px"
 * ></oe-task-meter>
 * ```
 *
 * @example
 * ```css
 * oe-task-meter {
 *   height: 1.75em;
 * }
 * oe-task-meter::part(segment) {
 *   display: flex;
 *   align-items: center;
 *   justify-content: center;
 *   overflow: hidden;
 *   white-space: nowrap;
 * }
 * oe-task-meter::part(segment)::after {
 *   content: attr(data-decision);
 * }
 * oe-task-meter::part(verification true)::after {
 *   content: "\2705";
 * }
 * ```
 *
 * @csspart meter - The container that holds every segment
 * @csspart segment - Every segment in the meter
 * @csspart verification - Segments that represent a verification task
 * @csspart classification - Segments that represent a classification task
 * @csspart new-tag - Segments that represent a new tag (tag correction) task
 * @csspart true - Segments with a "true" decision
 * @csspart false - Segments with a "false" decision
 * @csspart unsure - Segments with an "unsure" decision
 * @csspart skip - Segments with a "skip" decision
 * @csspart not-required - Segments whose decision is not required
 * @csspart undecided - Segments that do not have a decision yet
 *
 * @cssproperty [--oe-task-meter-height=0.8rem] - The host height, inherited by the meter inside the shadow root
 * @cssproperty [--oe-task-meter-gap=0px] - A preferred CSS gap length, reduced when segments would become too narrow
 * @cssproperty [--oe-task-meter-rounding=var(--oe-border-rounding)] - The corner radius of the meter
 * @cssproperty [--oe-task-meter-border-width=var(--oe-border-width)] - The width of the meter outline and separators
 * @cssproperty [--oe-task-meter-border-color=var(--oe-border-color)] - The color of the meter outline and separators
 * @cssproperty [--oe-task-meter-segment-min-width=0.5em] - The preferred segment minimum; gaps collapse before segments shrink further
 * @cssproperty [--oe-task-meter-min-width=1em] - The host minimum width
 * @cssproperty [--oe-task-meter-min-height=0.5em] - The host minimum height
 */
@customElement("oe-task-meter")
export class TaskMeterComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(taskMeterStyles);

  /** Disables the tooltips that describe each segment's decision. */
  @property({ attribute: "disable-tooltips", type: Boolean, converter: booleanConverter })
  public disableTooltips = false;

  /**
   * Where the segment tooltips are positioned relative to the meter.
   * @values "top" | "bottom" | "left" | "right"
   * @default "top"
   */
  @property({
    attribute: "tooltip-placement",
    type: String,
    converter: enumConverter(TaskMeterTooltipPlacement, TaskMeterTooltipPlacement.TOP),
  })
  public tooltipPlacement: TaskMeterTooltipPlacement = TaskMeterTooltipPlacement.TOP;

  // The subject can be undefined if this component is not slotted inside of a
  // grid tile component.
  //
  // TODO: This is technically a public facing API/property, so we should ensure
  // that the type passed into the "tile" property is a gridTileContext.
  @consume({ context: gridTileContext, subscribe: true })
  private tile?: VerificationGridTileContext;

  @consume({ context: injectionContext, subscribe: true })
  private injector!: VerificationGridInjector;

  private segmentState(decision: OptionalDecision | undefined): TaskMeterSegmentState {
    if (decision === undefined) {
      return "undecided";
    } else if (decision === decisionNotRequired) {
      return "not-required";
    }

    return decision.confirmed;
  }

  private segmentColor(decision: OptionalDecision | undefined): string | undefined {
    if (decision === undefined) {
      return undefined;
    }

    return this.injector.colorService(decision);
  }

  private classificationSegment(requiredTag: Tag): TaskMeterSegment {
    const decision = this.tile?.model.classifications.get(requiredTag.text);
    const decisionText = decision ? decision.confirmed : "no decision";

    return {
      kind: "classification",
      state: this.segmentState(decision),
      label: `${requiredTag.text} (${decisionText})`,
      color: this.segmentColor(decision),
      tagText: requiredTag.text,
    };
  }

  private verificationSegment(): TaskMeterSegment {
    const currentVerificationModel = this.tile?.model.verification;

    let decisionText = "no decision";
    if (currentVerificationModel === decisionNotRequired) {
      decisionText = "not required";
    } else if (currentVerificationModel) {
      decisionText = currentVerificationModel.confirmed;
    }

    // Sometimes there is no tag on the subject. In this case, we have to
    // change the tooltip a bit.
    const verificationTagText =
      currentVerificationModel && currentVerificationModel !== decisionNotRequired
        ? currentVerificationModel.tag?.text
        : undefined;

    const label = verificationTagText
      ? `verification: ${verificationTagText} (${decisionText})`
      : `verification: ${decisionText}`;

    return {
      kind: "verification",
      state: this.segmentState(currentVerificationModel),
      label,
      color: this.segmentColor(currentVerificationModel),
      tagText: verificationTagText,
    };
  }

  private newTagSegment(): TaskMeterSegment {
    const currentNewTag = this.tile?.model.newTag;

    let label = "";
    let tagText: string | undefined;
    if (currentNewTag === decisionNotRequired) {
      label = "new tag: not required";
    } else if (currentNewTag) {
      if (currentNewTag.confirmed === DecisionOptions.SKIP) {
        label = `new tag: ${DecisionOptions.SKIP}`;
      } else {
        tagText = currentNewTag.tag?.text;
        label = `new tag: ${tagText}`;
      }
    } else {
      label = "new tag: no decision";
    }

    return {
      kind: "new-tag",
      state: this.segmentState(currentNewTag),
      label,
      color: this.segmentColor(currentNewTag),
      tagText,
    };
  }

  private segments(): TaskMeterSegment[] {
    const requiredDecisions = this.tile?.requiredDecisions ?? [];
    return requiredDecisions.map((requiredDecision: RequiredDecision) => {
      if (requiredDecision === requiredVerificationPlaceholder) {
        return this.verificationSegment();
      } else if (requiredDecision === requiredNewTagPlaceholder) {
        return this.newTagSegment();
      }

      return this.classificationSegment(requiredDecision);
    });
  }

  private accessibleSummary(segments: readonly TaskMeterSegment[]): string {
    const completedCount = segments.filter((segment) => segment.state !== "undecided").length;
    const segmentLabels = segments.map((segment) => segment.label).join("; ");
    return `Task progress: ${completedCount} of ${segments.length} decisions made. ${segmentLabels}`;
  }

  private segmentTemplate(segment: TaskMeterSegment): HTMLTemplateResult {
    // The private "--decision-color" variable is always set on the segment so
    // that a value set on an ancestor element cannot leak into undecided
    // segments. Users should restyle segments through the exposed parts.
    const decisionColor = segment.color ? `var(${segment.color})` : "var(--oe-undecided-color)";

    return html`
      <sl-tooltip
        content="${segment.label}"
        placement="${this.tooltipPlacement}"
        ?disabled="${this.disableTooltips}"
        hoist
      >
        <span
          class="task-meter-segment"
          part="segment ${segment.kind} ${segment.state}"
          data-kind="${segment.kind}"
          data-decision="${segment.state}"
          data-tag="${ifDefined(segment.tagText)}"
          style="--decision-color: ${decisionColor}"
        ></span>
      </sl-tooltip>
    `;
  }

  public render(): HTMLTemplateResult {
    const segments = this.segments();

    return html`
      <div
        class="task-meter"
        part="meter"
        role="img"
        aria-label="${this.accessibleSummary(segments)}"
        style="--_segment-count: ${Math.max(1, segments.length)}"
      >
        ${repeat(segments, (segment) => this.segmentTemplate(segment))}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-task-meter": TaskMeterComponent;
  }
}
