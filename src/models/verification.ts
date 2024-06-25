export type VerificationSubject = Record<string, unknown>;

export interface Tag {
  id?: number;
  text: string;
}

export interface IDecisionWrapper {
  subject: VerificationSubject;
  url: string;
  decisions: Classification[];
  tag: string;
}

export enum VerificationDecision {
  FALSE = "false",
  TRUE = "true",
  UNSURE = "unsure",
  SKIP = "skip",
}

// the Verification model is emitted by the oe-verification-grid as a CustomEvent
export class DecisionWrapper {
  public constructor(data: IDecisionWrapper) {
    this.subject = data.subject;
    this.decisions = data.decisions;
    this.url = data.url;
    this.tag = data.tag;
  }

  // aka: context
  // this is the native data model used by the host application
  // or this could be the csv row
  public subject: VerificationSubject;
  public decisions: Classification[];
  public url: string;
  public tag: string;

  // other metadata e.g. verificationDate

  public get additionalTags(): string[] {
    // prettier-ignore
    return this.decisions
      .filter((decision) => decision.type === "classification")
      .map((decision) => decision.tag.text);
  }
}

export class Classification {
  public constructor(data: Classification) {
    this.tag = data.tag;
    this.confirmed = data.confirmed;
  }

  public type = "classification";
  public tag: Tag;
  public confirmed: VerificationDecision;
}

export class Verification extends Classification {
  public constructor(data: Verification) {
    super(data);
  }

  public type = "verification";
}

// page function will return subjects that will be appended to the verification
// by default, we will search for the url and tag fields in the subject
// if we cannot find these fields, then we allow the names of these fields to
// be overwritten by element attributes (or a function callback)
// e.g. if tag/tags is an array then we can use the function callback to decide
// on what tag to use
