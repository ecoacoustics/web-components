import { Verification } from "./decisions/verification";
import { Tag } from "./tag";
import { Hertz, Seconds } from "./unitConverters";

export class Annotation {
  public constructor(
    startOffset: Seconds,
    endOffset: Seconds,
    lowFrequency: Hertz,
    highFrequency: Hertz,
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
  public endOffset: Seconds;
  public lowFrequency: Hertz;
  public highFrequency: Hertz;
  public tags: Tag[];
  public readonly reference: Readonly<object>;
  public verifications: Verification[];

  public valid(): Readonly<boolean> {
    return this.lowFrequency < this.highFrequency && this.startOffset < this.endOffset;
  }
}
