import { Verification } from "./decisions/verification";
import { Tag } from "./tag";
import { Hertz, Seconds } from "./unitConverters";

export class Annotation {
  public constructor(
    startOffset: Seconds,
    endOffset: Seconds | undefined,
    lowFrequency: Hertz | undefined,
    highFrequency: Hertz | undefined,
    tags: Tag[],
    reference: object,
    verifications: Verification[],
  ) {
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.lowFrequency = lowFrequency;
    this.highFrequency = highFrequency;
    this.tags = tags;
    this.reference = reference;
    this.verifications = verifications;
  }

  public startOffset: Seconds;
  public endOffset: Seconds | undefined;
  public lowFrequency: Hertz | undefined;
  public highFrequency: Hertz | undefined;
  public tags: Tag[];
  public readonly reference: Readonly<object>;
  public verifications: Verification[];

  public valid(): boolean {
    // A missing frequency means that bound is unconstrained, so any existing
    // frequency value is valid as long as the other bound is also present.
    const frequenciesValid =
      this.lowFrequency === undefined || this.highFrequency === undefined || this.lowFrequency < this.highFrequency;

    // A missing endOffset renders as a single vertical line, which is valid
    const timeValid = this.endOffset === undefined || this.startOffset < this.endOffset;

    return frequenciesValid && timeValid;
  }
}
