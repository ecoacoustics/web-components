import { Classification } from "./decisions/classification";
import { Decision, DecisionOptions } from "./decisions/decision";
import { Verification } from "./decisions/verification";
import { Tag, TagName } from "./tag";
import { EnumValue } from "../helpers/types/advancedTypes";

/** Original unprocessed data from the data source */
export type Subject = Record<PropertyKey, unknown>;

const columnNamespace = "oe_" as const;

// since we do not know the input format of the provided csv or json files
// it is possible for users to input a csv file that already has a column name
// to prevent column name collision, we prepend all the fields that we add
// to the original data input with "oe"
const tagColumnName = `${columnNamespace}tag` as const;
const confirmedColumnName = `${columnNamespace}confirmed` as const;
type ClassificationColumn = `${typeof columnNamespace}${string}`;

export interface DownloadableResult extends Subject {
  [tagColumnName]: string;
  [confirmedColumnName]: EnumValue<DecisionOptions>;
  [key: ClassificationColumn]: EnumValue<DecisionOptions>;
}

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
  public verificationDecisions?: Verification;
  public classificationDecisions = new Map<TagName, Classification>();
  public url: string;
  public tag: Tag;

  public get decisions(): ReadonlyMap<string, Decision> {
    const decisionMap = new Map([...this.classificationDecisions]);

    if (this.verificationDecisions) {
      decisionMap.set(this.verificationDecisions.tag.text, this.verificationDecisions);
    }

    return decisionMap;
  }

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
    if (decision instanceof Verification) {
      this.addVerification(decision);
    } else if (decision instanceof Classification) {
      this.addClassification(decision);
    } else {
      throw new Error("Invalid decision type");
    }
  }

  /** Removes a decision from the subject */
  public removeDecision(decision: Decision) {
    if (decision instanceof Verification) {
      this.removeVerification();
    } else if (decision instanceof Classification) {
      this.removeClassification(decision.tag);
    } else {
      throw new Error("Invalid decision type");
    }
  }

  public addVerification(model: Verification): void {
    // when a verification decision is made, it usually doesn't have a tag
    // on the model. This is because the tag is usually associated with the
    // subject, which the verification button cannot know about when it makes
    // the verification model
    //
    // additionally, because the verification model passed into this function
    // will be the same object and share the same reference with all other
    // verification models produced by the verification button, we create a new
    // instance of the verification model with the populated tag field using
    // the verification models addTag() method.
    // this creates a new instance of the verification model so that when the
    // tag is changed, it doesn't update all references
    const populatedVerification = model.addTag(this.tag);
    this.verificationDecisions = populatedVerification;
  }

  public addClassification(model: Classification): void {
    this.classificationDecisions.set(model.tag.text, model);
  }

  public removeVerification(): void {
    this.verificationDecisions = undefined;
  }

  public removeClassification(tag: Tag): void {
    this.classificationDecisions.delete(tag.text);
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

  public toDownloadable(): Partial<DownloadableResult> {
    const namespace = columnNamespace;
    const classificationColumns: Record<string, EnumValue<DecisionOptions>> = {};

    const verificationColumns = this.verification
      ? {
          [tagColumnName]: this.verification.tag.text,
          [confirmedColumnName]: this.verification.confirmed,
        }
      : {};

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
