import { Verification } from "./decisions/verification";
import { Tag } from "./tag";
import { Hertz, Seconds } from "./unitConverters";

export class Annotation {
  public constructor(
    startOffset: Seconds,
    endOffset: Seconds | null | undefined,
    lowFrequency: Hertz | null | undefined,
    highFrequency: Hertz | null | undefined,
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
  public endOffset: Seconds | null | undefined;
  public lowFrequency: Hertz | null | undefined;
  public highFrequency: Hertz | null | undefined;
  public tags: Tag[];
  public readonly reference: Readonly<object>;
  public verifications: Verification[];

  public valid(): boolean {
    // null or undefined means that bound is unconstrained (no frequency bounds given)
    const frequenciesValid =
      this.lowFrequency == null || this.highFrequency == null || this.lowFrequency < this.highFrequency;

    // null or undefined endOffset renders as a single vertical line, which is valid
    const timeValid = this.endOffset == null || this.startOffset < this.endOffset;

    return frequenciesValid && timeValid;
  }
}
