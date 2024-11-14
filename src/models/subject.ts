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
  public verification?: Verification;
  public classifications = new Map<TagName, Classification>();
  public url: string;
  public tag: Tag;

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
      if (this.classifications.has(tag.text)) {
        continue;
      }

      const skipClassification = new Classification(DecisionOptions.SKIP, tag);
      this.addDecision(skipClassification);
    }
  }

  /** Checks if the current subject has a decision */
  public hasDecision(queryingDecision: Decision): boolean {
    if (queryingDecision instanceof Verification) {
      return this.verification?.confirmed === queryingDecision.confirmed;
    }

    const matchingClassification = this.classifications.get(queryingDecision.tag.text);
    if (matchingClassification === undefined) {
      return false;
    }

    const hasMatchingTag = queryingDecision.tag.text === matchingClassification.tag.text;
    const hasMatchingDecision = queryingDecision.confirmed === matchingClassification.confirmed;
    return hasMatchingTag && hasMatchingDecision;
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

    const classificationModels = this.classifications.values();
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

  private addVerification(model: Verification): void {
    // when a verification decision is made, it doesn't have a tag on the model.
    // This is because the tag is usually associated with the subject, which the
    // verification button cannot know about when it makes the verification
    // model
    const populatedVerification = model.withTag(this.tag);
    this.verification = populatedVerification;
  }

  private addClassification(model: Classification): void {
    this.classifications.set(model.tag.text, model);
  }

  private removeVerification(): void {
    this.verification = undefined;
  }

  private removeClassification(tag: Tag): void {
    this.classifications.delete(tag.text);
  }
}
