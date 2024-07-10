export type VerificationSubject = Record<string, unknown>;

export interface Tag {
  id?: number;
  text: string;
}

export enum VerificationDecision {
  FALSE = "false",
  TRUE = "true",
  UNSURE = "unsure",
  SKIP = "skip",
}

export interface IDecisionWrapper {
  subject: VerificationSubject;
  url: string;
  decisions: Classification[];
  tag: string;

  // a target can be used to identify where the decision came from
  // e.g. a specific decision or classification button
  origin?: number;
}

// the Verification model is emitted by the oe-verification-grid as a CustomEvent
export class DecisionWrapper {
  public constructor(data: IDecisionWrapper) {
    this.subject = data.subject;
    this.decisions = data.decisions;
    this.url = data.url;
    this.tag = data.tag;
    this.origin = data.origin;
  }

  // aka: context
  // this is the native data model used by the host application
  // or this could be the csv row
  public subject: VerificationSubject;
  public decisions: Classification[];
  public url: string;
  public tag: string;
  public origin?: number;

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

export class Annotation {
  public constructor(data: Annotation) {
    this.startOffset = data.startOffset;
    this.endOffset = data.endOffset;
    this.lowFrequency = data.lowFrequency;
    this.highFrequency = data.highFrequency;
    this.tags = data.tags;
    this.reference = data.reference;
    this.verifications = data.verifications;
  }

  startOffset: number;
  endOffset: number;
  lowFrequency: number;
  highFrequency: number;
  tags: Tag[];
  reference: object;
  verifications: Verification[];
}
