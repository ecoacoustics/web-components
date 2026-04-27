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
    // undefined == null evaluates to true, so either missing frequency makes
    // the frequency constraint pass (no bounds to violate)
    const frequenciesValid =
      this.lowFrequency == null || this.highFrequency == null || this.lowFrequency < this.highFrequency;

    // A missing endOffset renders as a single vertical line, which is valid
    const timeValid = this.endOffset == null || this.startOffset < this.endOffset;

    return frequenciesValid && timeValid;
  }
}
