import { Classification } from "./decisions/classification";
import { Decision, DecisionOptions } from "./decisions/decision";
import { Verification } from "./decisions/verification";
import { Tag, TagName } from "./tag";
import { Constructor, EnumValue } from "../helpers/types/advancedTypes";
import { NewTag } from "./decisions/newTag";
import { decisionNotRequired, OptionalDecision } from "./decisions/decisionNotRequired";
import { SubjectChange } from "verification-grid/verification-grid";

export enum AudioCachedState {
  COLD,
  REQUESTED,
  SUCCESS,
  FAILED,
}

/** Original unprocessed data from the data source */
export type Subject = Record<PropertyKey, unknown>;

const columnNamespace = "oe_";

// since we do not know the input format of the provided csv or json files
// it is possible for users to input a csv file that already has a column name
// to prevent column name collision, we prepend all the fields that we add
// to the original data input with "oe"
const tagColumnName = `${columnNamespace}tag`;
const confirmedColumnName = `${columnNamespace}confirmed`;
const newTagColumnName = `${columnNamespace}new_tag`;
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
  public constructor(subject: Subject, url: string, tag: Tag | null) {
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
  public clientCached = AudioCachedState.COLD;

  /** If the audio has been warmed/split on the server using a HEAD request */
  public serverCached = AudioCachedState.COLD;

  // each row can only have one verification decision
  // but can have multiple classification decisions
  // verification decisions will be reflected in the oe-confirmed
  // column, while each classification will get its own row
  public verification?: OptionalDecision<Verification>;
  public newTag?: OptionalDecision<NewTag>;
  public classifications = new Map<TagName, Classification>();
  public url: string;
  public tag: Tag | null;

  /**
   * Adds a decision to the subject and removes any decisions that have been
   * made against the same tag.
   * Decisions that are made about the same tag are removed so that it is not
   * possible to have both a positive and negative decision about a tag
   */
  public addDecision(decision: Decision): SubjectChange {
    if (decision instanceof Verification) {
      return this.addVerification(decision);
    } else if (decision instanceof Classification) {
      return this.addClassification(decision);
    } else if (decision instanceof NewTag) {
      return this.applyNewTag(decision);
    } else {
      throw new Error("Invalid decision type");
    }
  }

  /** Removes a decision from the subject */
  public removeDecision(decision: Decision): SubjectChange {
    if (decision instanceof Verification) {
      return this.removeVerification();
    } else if (decision instanceof Classification) {
      return this.removeClassification(decision.tag);
    } else if (decision instanceof NewTag) {
      return this.removeNewTag();
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
   * @param requiresVerification
   * Looks at the subject model and applies a skip decision to the
   * verification task if none is applied
   *
   * @param requiredClassifications
   * Classifications that will be * applied as a skip decision if not present
   * on the subject
   *
   * @returns
   * An SubjectChange object that describes what changes were made to the
   * subject as part of this method call.
   */
  public skipUndecided(
    requiresVerification: boolean,
    requiresNewTag: boolean,
    requiredClassifications: Tag[],
  ): SubjectChange {
    let changeReceipt: SubjectChange = {};

    // each subject can only have one verification decision
    const isMissingVerification = requiresVerification && this.verification === undefined;
    if (isMissingVerification) {
      const skipVerification = new Verification(DecisionOptions.SKIP, this.tag);
      changeReceipt = { ...changeReceipt, ...this.addDecision(skipVerification) };
    }

    const isMissingNewTag = requiresNewTag && this.newTag === undefined;
    if (isMissingNewTag) {
      const skipNewTag = new NewTag(DecisionOptions.SKIP, null);
      changeReceipt = { ...changeReceipt, ...this.addDecision(skipNewTag) };
    }

    for (const tag of requiredClassifications) {
      if (this.classifications.has(tag.text)) {
        continue;
      }

      const skipClassification = new Classification(DecisionOptions.SKIP, tag);
      changeReceipt = { ...changeReceipt, ...this.addDecision(skipClassification) };
    }

    return changeReceipt;
  }

  /**
   * @returns
   * A SubjectChange object that explicitly states if any decisions were set to
   * "null" as a result of their decision no longer being required, and
   * therefore removed.
   */
  public setDecisionNotRequired(decision: Constructor<Decision>): SubjectChange {
    if (decision === Verification) {
      this.verification = decisionNotRequired;
      return { verification: decisionNotRequired };
    } else if (decision === NewTag) {
      this.newTag = decisionNotRequired;
      return { newTag: decisionNotRequired };
    }

    return {};
  }

  // This method does not return a SubjectChange because it cannot change any
  // decision values from being called.
  public setDecisionRequired(decision: Constructor<Decision>): void {
    if (decision === Verification) {
      this.verification = this.verification === decisionNotRequired ? undefined : this.verification;
    } else if (decision === NewTag) {
      this.newTag = this.newTag === decisionNotRequired ? undefined : this.newTag;
    }
  }

  /** Checks if the current subject has a decision */
  public hasDecision(queryingDecision: Decision): boolean {
    if (queryingDecision instanceof Verification) {
      if (this.verification === decisionNotRequired) {
        return true;
      }

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

    const verificationColumns =
      this.verification && this.verification !== decisionNotRequired
        ? {
            [tagColumnName]: this.verification.tag.text,
            [confirmedColumnName]: this.verification.confirmed,
          }
        : {};

    const newTagColumns =
      this.newTag && this.newTag !== decisionNotRequired
        ? {
            [newTagColumnName]: this.newTag.tag.text,
          }
        : {};

    const classificationModels = this.classifications.values();
    for (const classification of classificationModels) {
      const column = `${namespace}${classification.tag.text}`;
      const value = classification.confirmed;
      classificationColumns[column] = value;
    }

    // the toJSON method is a protocol that is used by JSON.stringify and
    // other serialization methods to convert an object into a more simplified
    // format
    // we test if the subject has a toJSON method and use it if possible
    // since toJSON isn't always available on the object prototype, we want to
    // simply return the original object if the toJSON method isn't available
    const originalSubject = typeof this.subject.toJSON === "function" ? this.subject.toJSON() : this.subject;

    return {
      ...originalSubject,
      ...newTagColumns,
      ...verificationColumns,
      ...classificationColumns,
    };
  }

  private addVerification(model: Verification): SubjectChange {
    // when a verification decision is made, it doesn't have a tag on the model.
    // This is because the tag is usually associated with the subject, which the
    // verification button cannot know about when it makes the verification
    // model
    const populatedVerification = model.withTag(this.tag);
    this.verification = populatedVerification;

    return { verification: populatedVerification };
  }

  private addClassification(model: Classification): SubjectChange {
    this.classifications.set(model.tag.text, model);
    return {
      classifications: Object.freeze(this.classifications),
    };
  }

  private applyNewTag(model: NewTag): SubjectChange {
    this.newTag = model;
    return { newTag: model };
  }

  private removeVerification(): SubjectChange {
    this.verification = undefined;
    return { verification: null };
  }

  private removeClassification(tag: Tag): SubjectChange {
    this.classifications.delete(tag.text);

    // We use Object.freeze here because SubjectChange's are emitted to the host
    // application as part of decision-made events.
    // Therefore, to stop the host application from modifying the
    // classifications map directly, we freeze the object.
    // We use Object.freeze instead of a TypeScript Readonly annotation so that
    // applications that do not use TypeScript can still get assurance that they
    // are not directly modifying internal state.
    return {
      classifications: Object.freeze(this.classifications),
    };
  }

  private removeNewTag(): SubjectChange {
    this.newTag = undefined;
    return { newTag: null };
  }
}
