export type VerificationSubject = Record<string, unknown>;

export interface Tag {
  id: number | undefined;
  text: string;
}

// the Verification model is emitted by the oe-verification-grid as a CustomEvent
export class Verification {
  public constructor(data: Verification) {
    this.subject = data.subject;
    this.url = data.url;
    this.tag = data.tag;
    this.confirmed = data.confirmed;
    this.additionalTags = data.additionalTags;
  }

  // aka: context
  // this is the native data model used by the host application
  // or this could be the csv row
  public subject: VerificationSubject;
  public url: string;
  public tag: Tag | null;
  public confirmed: boolean;
  public additionalTags: string[];

  // other metadata e.g. verificationDate
}

// page function will return subjects that will be appended to the verification
// by default, we will search for the url and tag fields in the subject
// if we cannot find these fields, then we allow the names of these fields to
// be overwritten by element attributes (or a function callback)
// e.g. if tag/tags is an array then we can use the function callback to decide
// on what tag to use
