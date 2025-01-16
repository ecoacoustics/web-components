import { Verification } from "./decisions/verification";
import { Tag } from "./tag";

export class Annotation {
  public constructor(
    startOffset: number,
    endOffset: number,
    lowFrequency: number,
    highFrequency: number,
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

  public startOffset: number;
  public endOffset: number;
  public lowFrequency: number;
  public highFrequency: number;
  public tags: Tag[];
  public reference: object;
  public verifications: Verification[];

  public valid(): Readonly<boolean> {
    return this.lowFrequency < this.highFrequency && this.startOffset < this.endOffset;
  }
}
