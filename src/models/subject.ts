import { DataSourceComponent } from "../components/data-source/data-source";
import { Classification } from "./decisions/classification";
import { Decision, DecisionOptions } from "./decisions/decision";
import { Verification } from "./decisions/verification";
import { Tag, TagName } from "./tag";
import { EnumValue } from "../helpers/types/advancedTypes";

/** Original unprocessed data from the data source */
export type Subject = Record<PropertyKey, unknown>;

/**
 * @constructor
 * @param {Subject} subject
 * The original data provided by the data source
 *
 * @param {String} url
 * The url that has been extracted from the original data source
 *
 * @param {Tag} tag
 * The tag that has been extracted from the original data source
 */
export class SubjectWrapper {
  public constructor(subject: Subject, url: string, tag: Tag) {
    this.subject = subject;
    this.url = url;
    this.tag = tag;
  }

  /**
   * @description
   * aka: context
   * this is the native data model used by the host application
   * or this could be the csv row
   *
   * !the subject object reference must remain the same for the lifetime of
   * !the application, otherwise downloading results will result in unexpected
   * !or incorrect output
   */
  public subject: Readonly<Subject>;

  /** If the audio has been pre-fetched using a GET request */
  public clientCached = false;

  /** If the audio has been warmed/split on the server using a HEAD request */
  public serverCached = false;

  // each row can only have one verification decision
  // but can have multiple classification decisions
  // verification decisions will be reflected in the oe-confirmed
  // column, while each classification will get its own row
  public decisions = new Map<TagName, Decision>();
  public url: string;
  public tag: Tag;

  /** An array of all the decisions applied to a subject */
  public get decisionModels(): Decision[] {
    return Array.from(this.decisions.values());
  }

  /** The singular verification decision that has been applied to a subject */
  public get verification(): Verification | undefined {
    return this.decisions.get(this.tag.text) as Verification;
  }

  /** Multiple classification decisions that have been applied to a subject */
  public get classifications(): Classification[] {
    return this.decisionModels.filter((decision) => decision instanceof Classification) as Classification[];
  }

  /**
   * Adds a decision to the subject and removes any decisions that have been
   * made against the same tag.
   * Decisions that are made about the same tag are removed so that it is not
   * possible to have both a positive and negative decision about a tag
   */
  public addDecision(decision: Decision): void {
    this.decisions.set(decision.tag.text, decision);
  }

  /** Removes a decision from the subject */
  public removeDecision(decisionToRemove: Decision) {
    this.decisions.delete(decisionToRemove.tag.text);
  }

  /**
   * @description
   * Compares the subjects decisions to an array of required tags and
   * applies a skip decision to any required tags that do not have a decision
   * made about them
   *
   * @param {Boolean} requiresVerification
   * Looks at the subject model and applies a skip decision to the
   * verification task if none is applied
   *
   * @param {Array} requiredClassifications
   * Classifications that will be * applied as a skip decision if not present
   * on the subject
   */
  public skipUndecided(requiresVerification: boolean, requiredClassifications: Tag[]): void {
    // each subject can only have one verification decision
    const isMissingVerification = requiresVerification && this.verification === undefined;
    if (isMissingVerification) {
      const skipVerification = new Verification(DecisionOptions.SKIP, this.tag);
      this.addDecision(skipVerification);
    }

    for (const tag of requiredClassifications) {
      if (this.classifications.some((classification) => classification.tag.text === tag.text)) {
        continue;
      }

      const skipClassification = new Classification(DecisionOptions.SKIP, tag);
      this.addDecision(skipClassification);
    }
  }

  /** Checks if the current subject has a decision */
  public hasDecision(queryingDecision: Decision): boolean {
    const decision = this.decisions.get(queryingDecision.tag.text);
    if (decision === undefined) {
      return false;
    }

    return queryingDecision.confirmed === decision?.confirmed;
  }

  /** Checks if the current subject has a tag applied */
  public hasTag(tag: Tag): boolean {
    return this.decisions.has(tag.text);
  }

  /** Checks if all tags in an array are present on a subject */
  public hasTags(tags: Tag[]): boolean {
    return tags.every((tag) => this.hasTag(tag));
  }

  public toJSON() {
    const namespace = DataSourceComponent.columnNamespace;
    const verificationColumns: Record<string, EnumValue<DecisionOptions>> = {};
    const classificationColumns: Record<string, EnumValue<DecisionOptions>> = {};
    
    const verificationModel = this.verification;
    if (verificationModel) {
      verificationColumns[`${namespace}tag`] = verificationModel.tag;
      verificationColumns[`${namespace}confirmed`] = verificationModel.confirmed;
    }

    const classificationModels = this.classifications;
    for (const classification of classificationModels) {
      const column = `${namespace}${classification.tag.text}`;
      const value = classification.confirmed;
      classificationColumns[column] = value;
    }

    return {
      ...this.subject,
      ...verificationColumns,
      ...classificationColumns,
    };
  }
}
